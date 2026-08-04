import os
from io import BytesIO
from typing import Optional

import httpx
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

from ..schemas import SlidePlan
from .image_service import UPLOAD_DIR, is_remote_url

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)


def _hex_to_rgb(hex_color: str) -> RGBColor:
    hex_color = hex_color.lstrip("#")
    return RGBColor(int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16))


def _blank_slide(prs: Presentation):
    return prs.slides.add_slide(prs.slide_layouts[6])  # blank layout


def _load_image_bytes(image_path: str) -> Optional[bytes]:
    """Load raw image bytes given either a full URL (R2, production) or a
    local filename under UPLOAD_DIR (local dev). Returns None if the image
    can't be fetched/found, so callers can skip it gracefully."""
    if is_remote_url(image_path):
        try:
            resp = httpx.get(image_path, timeout=10.0, follow_redirects=True)
            resp.raise_for_status()
            return resp.content
        except Exception:
            return None
    local_path = os.path.join(UPLOAD_DIR, image_path)
    if os.path.exists(local_path):
        with open(local_path, "rb") as f:
            return f.read()
    return None


def _add_cover_image(slide, img_bytes: bytes, x, y, w, h):
    """Place an image filling exactly the (x, y, w, h) box, cropping the source
    image (never stretching it) to emulate CSS `object-fit: cover` — the same
    behavior the web preview uses. Falls back to a plain (stretched) placement
    if the image can't be read."""
    pic = slide.shapes.add_picture(BytesIO(img_bytes), x, y, width=w, height=h)
    try:
        with Image.open(BytesIO(img_bytes)) as im:
            src_w, src_h = im.size
    except Exception:
        return pic

    if not src_w or not src_h:
        return pic

    img_ratio = src_w / src_h
    box_ratio = w / h

    if img_ratio > box_ratio:
        # source is relatively wider than the target box: crop the left/right edges
        crop_frac = 1 - (box_ratio / img_ratio)
        pic.crop_left = crop_frac / 2
        pic.crop_right = crop_frac / 2
    elif img_ratio < box_ratio:
        # source is relatively taller than the target box: crop the top/bottom edges
        crop_frac = 1 - (img_ratio / box_ratio)
        pic.crop_top = crop_frac / 2
        pic.crop_bottom = crop_frac / 2

    return pic


def _add_contain_image(slide, img_bytes: bytes, x, y, w, h):
    """Place an image within the (x, y, w, h) box, preserving its aspect ratio
    and centering it (never stretching) — matches CSS `object-fit: contain`,
    which is what the logo overlay in the web preview uses. Distortion is
    fine for cropped product photos but not for a logo."""
    try:
        with Image.open(BytesIO(img_bytes)) as im:
            src_w, src_h = im.size
    except Exception:
        return slide.shapes.add_picture(BytesIO(img_bytes), x, y, width=w, height=h)

    if not src_w or not src_h:
        return slide.shapes.add_picture(BytesIO(img_bytes), x, y, width=w, height=h)

    img_ratio = src_w / src_h
    box_ratio = w / h

    if img_ratio > box_ratio:
        draw_w = w
        draw_h = int(w / img_ratio)
    else:
        draw_h = h
        draw_w = int(h * img_ratio)

    draw_x = x + (w - draw_w) // 2
    draw_y = y + (h - draw_h) // 2
    return slide.shapes.add_picture(BytesIO(img_bytes), draw_x, draw_y, width=draw_w, height=draw_h)


def _add_new_badge(slide, card_x, card_y, card_w, accent_rgb: RGBColor):
    """Small pill badge pinned to the top-right corner of a product card,
    marking products created within the last NEW_BADGE_DAYS days."""
    badge_w = Inches(0.62)
    badge_h = Inches(0.28)
    inset = Inches(0.08)
    bx = card_x + card_w - badge_w - inset
    by = card_y + inset

    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, bx, by, badge_w, badge_h)
    badge.adjustments[0] = 0.5  # fully rounded ends (pill shape)
    badge.fill.solid()
    badge.fill.fore_color.rgb = accent_rgb
    badge.line.fill.background()
    badge.shadow.inherit = False

    tf = badge.text_frame
    tf.word_wrap = False
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = "NEW"
    run.font.size = Pt(10)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
    return badge


def _add_accent_bar(slide, accent_rgb: RGBColor):
    bar = slide.shapes.add_shape(1, Inches(0), Inches(0), Inches(0.12), SLIDE_H)  # rectangle
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_rgb
    bar.line.fill.background()


def _add_text(slide, left, top, width, height, text, size, bold=False, color=None, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = color
    return box


def build_pptx(plan: SlidePlan, accent_color: str, currency_symbol: str) -> Presentation:
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    accent_rgb = _hex_to_rgb(accent_color)

    for slide_desc in plan.slides:
        slide = _blank_slide(prs)
        _add_accent_bar(slide, accent_rgb)

        if slide_desc.type == "cover":
            _add_text(slide, Inches(1), Inches(2.8), Inches(11), Inches(1.2),
                       slide_desc.title or "", 44, bold=True)
            _add_text(slide, Inches(1), Inches(3.9), Inches(11), Inches(0.8),
                       slide_desc.subtitle or "", 20, color=RGBColor(0x66, 0x66, 0x66))

            if slide_desc.logo_path:
                logo_bytes = _load_image_bytes(slide_desc.logo_path)
                if logo_bytes:
                    lx = slide_desc.logo_x if slide_desc.logo_x is not None else 0.75
                    ly = slide_desc.logo_y if slide_desc.logo_y is not None else 0.06
                    lw = slide_desc.logo_w if slide_desc.logo_w is not None else 0.18
                    lh = slide_desc.logo_h if slide_desc.logo_h is not None else 0.18
                    _add_contain_image(
                        slide, logo_bytes,
                        int(SLIDE_W * lx), int(SLIDE_H * ly),
                        int(SLIDE_W * lw), int(SLIDE_H * lh),
                    )

        elif slide_desc.type == "index":
            _add_text(slide, Inches(1), Inches(0.6), Inches(11), Inches(0.8),
                       "Index", 32, bold=True)
            y = Inches(1.8)
            for name in (slide_desc.categories or []):
                _add_text(slide, Inches(1), y, Inches(11), Inches(0.6), name, 22)
                y += Inches(0.7)

        elif slide_desc.type == "category":
            title = slide_desc.title or ""
            # Raised closer to the top edge (was y=0.4) to open up breathing room
            # between the title and the product cards below it.
            _add_text(slide, Inches(0.6), Inches(0.22), Inches(11), Inches(0.7), title, 28, bold=True)

            # 2x2 grid of horizontal cards: image on the left, details on the right
            products = slide_desc.products or []
            cell_w = Inches(5.9)
            cell_h = Inches(2.9)
            xs = [Inches(0.7), Inches(6.9)]
            ys = [Inches(1.4), Inches(4.5)]
            positions = [(xs[0], ys[0]), (xs[1], ys[0]), (xs[0], ys[1]), (xs[1], ys[1])]

            img_w = Inches(2.4)  # ~42% of cell_w, matching the web preview's image column
            text_left_offset = Inches(2.55)
            text_w = cell_w - text_left_offset
            border_inset = Inches(0.03)  # keeps the card border visible around the image edge

            for product, (x, y) in zip(products, positions):
                card = slide.shapes.add_shape(1, x, y, cell_w, cell_h)  # rectangle outline
                card.fill.solid()
                card.fill.fore_color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                card.line.color.rgb = RGBColor(0xE5, 0xE5, 0xE5)
                card.line.width = Pt(0.75)
                card.shadow.inherit = False

                if product.image_path:
                    img_bytes = _load_image_bytes(product.image_path)
                    if img_bytes:
                        _add_cover_image(
                            slide, img_bytes,
                            x + border_inset, y + border_inset,
                            img_w - border_inset, cell_h - 2 * border_inset,
                        )

                # Category name is already the slide title, so it isn't repeated
                # per-card — the brand/product name is now the card's headline,
                # in the accent color, taking the vertical space the category
                # eyebrow used to occupy.
                text_x = x + text_left_offset
                _add_text(slide, text_x, y + Inches(0.18), text_w, Inches(0.4),
                           product.name, 18, bold=True, color=accent_rgb)

                divider = slide.shapes.add_shape(1, text_x, y + Inches(0.68), Inches(0.35), Pt(1.5))
                divider.fill.solid()
                divider.fill.fore_color.rgb = RGBColor(0xDD, 0xDD, 0xDD)
                divider.line.fill.background()
                divider.shadow.inherit = False

                _add_text(slide, text_x, y + Inches(0.85), text_w, Inches(1.1),
                           product.description, 12, color=RGBColor(0x88, 0x88, 0x88))
                _add_text(slide, text_x, y + cell_h - Inches(0.55), text_w, Inches(0.4),
                           f"{currency_symbol}{product.price:,.2f}", 18, bold=True)

                if getattr(product, "is_new", False):
                    _add_new_badge(slide, x, y, cell_w, accent_rgb)

    return prs
