"use client";

import { useEffect, useRef, useState } from "react";

function paintGuide(canvas: HTMLCanvasElement, letter: string) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = "900 200px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.strokeStyle = "#b9dcca";
  context.lineWidth = 10;
  context.setLineDash([10, 12]);
  context.strokeText(letter, canvas.width / 2, canvas.height / 2 + 12);
  context.setLineDash([]);
}

export default function TraceCanvas({
  letter,
  disabled,
  onComplete
}: {
  letter: string;
  disabled: boolean;
  onComplete: (points: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (canvasRef.current) paintGuide(canvasRef.current, letter);
  }, [letter]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
      y: ((event.clientY - bounds.top) / bounds.height) * canvas.height
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point(event);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d");
    const current = point(event);
    const previous = lastPointRef.current;
    if (context && previous) {
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(current.x, current.y);
      context.strokeStyle = "#2f6e5c";
      context.lineWidth = 18;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke();
      setPoints((value) => value + 1);
    }
    lastPointRef.current = current;
  }

  function stop() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  function reset() {
    setPoints(0);
    if (canvasRef.current) paintGuide(canvasRef.current, letter);
  }

  return (
    <div className="trace-wrapper">
      <canvas
        ref={canvasRef}
        width={360}
        height={280}
        className="trace-canvas"
        aria-label={`Traza la letra ${letter}`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div className="trace-actions">
        <button className="link-button" type="button" disabled={disabled} onClick={reset}>
          Borrar
        </button>
        <button
          className="primary-button"
          type="button"
          disabled={disabled || points < 12}
          onClick={() => onComplete(points)}
        >
          ¡Listo!
        </button>
      </div>
      {points < 12 && !disabled && <small>Repasa la letra con tu dedo.</small>}
    </div>
  );
}
