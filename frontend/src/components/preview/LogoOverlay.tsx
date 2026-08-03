import type { CSSProperties } from "react";
import { Rnd } from "react-rnd";

interface LogoTransform {
  x: number; // fraction 0-1 of container width
  y: number; // fraction 0-1 of container height
  w: number; // fraction 0-1 of container width
  h: number; // fraction 0-1 of container height
}

interface Props {
  logoUrl: string;
  containerSize: { width: number; height: number };
  transform: LogoTransform;
  onChange: (t: LogoTransform) => void;
}

const HANDLE_STYLE: CSSProperties = {
  width: 10,
  height: 10,
  background: "#fff",
  border: "1.5px solid #666",
  borderRadius: 2,
};

export default function LogoOverlay({ logoUrl, containerSize, transform, onChange }: Props) {
  if (!containerSize.width || !containerSize.height) return null;

  const { x, y, w, h } = transform;

  return (
    <Rnd
      bounds="parent"
      size={{ width: w * containerSize.width, height: h * containerSize.height }}
      position={{ x: x * containerSize.width, y: y * containerSize.height }}
      lockAspectRatio={false}
      className="logo-overlay"
      resizeHandleStyles={{
        topLeft: HANDLE_STYLE,
        topRight: HANDLE_STYLE,
        bottomLeft: HANDLE_STYLE,
        bottomRight: HANDLE_STYLE,
      }}
      onDragStop={(_e, d) => {
        onChange({
          x: d.x / containerSize.width,
          y: d.y / containerSize.height,
          w,
          h,
        });
      }}
      onResizeStop={(_e, _direction, ref, _delta, pos) => {
        onChange({
          x: pos.x / containerSize.width,
          y: pos.y / containerSize.height,
          w: ref.offsetWidth / containerSize.width,
          h: ref.offsetHeight / containerSize.height,
        });
      }}
    >
      <img src={logoUrl} alt="Logo" className="logo-overlay-img" draggable={false} />
    </Rnd>
  );
}
