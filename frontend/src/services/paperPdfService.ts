/**
 * Generate a PDF blob from the question paper preview container.
 * Uses the same layout as the preview (PrintablePaper) so colors and alignment match.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function generatePaperPdfBlob(containerElement: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(containerElement, {
    useCORS: true,
    scale: 2,
    logging: false,
    backgroundColor: null,
    windowWidth: containerElement.scrollWidth,
    windowHeight: containerElement.scrollHeight,
    onclone: (clonedDoc, el) => {
      const clone = el as HTMLElement;
      clone.style.width = `${containerElement.scrollWidth}px`;
      clone.style.position = 'absolute';
      clone.style.left = '0';
      clone.style.top = '0';
      // Preserve colors in the clone
      clone.querySelectorAll('*').forEach((node) => {
        const n = node as HTMLElement;
        if (n.style) {
          n.style.webkitPrintColorAdjust = 'exact';
          n.style.printColorAdjust = 'exact';
        }
      });
    },
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = pdfHeight - margin * 2;
  // Scale: same as preview; one PDF "page" height in canvas pixels
  const scale = contentWidth / canvas.width;
  const pageHeightPx = contentHeight / scale;

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    if (!first) pdf.addPage();
    first = false;
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvas.width;
    tmpCanvas.height = sliceHeight;
    const ctx = tmpCanvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    const sliceData = tmpCanvas.toDataURL('image/png', 1.0);
    const slicePdfHeight = (sliceHeight / canvas.width) * contentWidth;
    pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, slicePdfHeight);
    y += sliceHeight;
  }

  return pdf.output('blob');
}
