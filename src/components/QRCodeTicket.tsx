"use client";
import QRCode from "qrcode";
import { useEffect, useRef } from "react";

export default function QRCodeTicket({
  ticketCode,
  width = 150,
}: {
  ticketCode: string;
  width?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.height = width + 50;
    canvas.width = width;
    const canvasContext = canvas.getContext("2d")!;
    canvasContext.fillStyle = "#fff";
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    canvasContext.font = "16px Arial";
    canvasContext.textAlign = "center";
    canvasContext.fillStyle = "#000";
    canvasContext.fillText(
      `Mã vé: ${ticketCode}`,
      canvas.width / 2,
      canvas.width + 30
    );

    const virtualCanvas = document.createElement("canvas");

    QRCode.toCanvas(
      virtualCanvas,
      `https://railskylines-fe-4.onrender.com/ticket?ticketCode=${ticketCode}`,
      { width },
      function (error: any) {
        if (error) console.error(error);
        canvasContext.drawImage(virtualCanvas, 0, 0, width, width);
      }
    );
  }, [ticketCode, width]);

  return <canvas ref={canvasRef} />;
}
