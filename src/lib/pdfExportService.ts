import jsPDF from 'jspdf';
import { JournalEntry } from '../types';
import { auth } from './firebase';

export interface PdfExportProgress {
  status: 'initializing' | 'fetching_images' | 'generating_pdf' | 'completed' | 'error';
  currentStep?: string;
  processedCount?: number;
  totalCount?: number;
  error?: string;
}

export class PdfExportService {
  /**
   * Helper to load an image attachment as base64 Data URL for jsPDF using authenticated endpoint
   */
  private static async fetchImageAsBase64(publicId: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User unauthenticated');
      const idToken = await currentUser.getIdToken();

      const res = await fetch(`/api/media/fetch-image?publicId=${encodeURIComponent(publicId)}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        console.warn(`[PdfExport] Failed to fetch image ${publicId}: ${res.status}`);
        return null;
      }

      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          // Load image to derive natural aspect ratio
          const img = new Image();
          img.onload = () => {
            resolve({
              dataUrl,
              width: img.naturalWidth || 600,
              height: img.naturalHeight || 400,
            });
          };
          img.onerror = () => {
            resolve({ dataUrl, width: 600, height: 400 });
          };
          img.src = dataUrl;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn(`[PdfExport] Error converting image ${publicId}:`, err);
      return null;
    }
  }

  /**
   * Generates a PDF for a single journal entry
   */
  public static async exportSingleJournalPdf(
    entry: JournalEntry,
    userName: string,
    onProgress?: (progress: PdfExportProgress) => void
  ): Promise<void> {
    onProgress?.({
      status: 'initializing',
      currentStep: 'Preparing memory document...',
      processedCount: 0,
      totalCount: 1,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageOverflow = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(margin, margin - 5, pageWidth - margin, margin - 5);
        return true;
      }
      return false;
    };

    // --- HEADER ---
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.setTextColor(79, 70, 229); // Indigo 600
    pdf.text('MindVault Memory Reflection', margin, y);
    y += 9;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    const exportDateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    pdf.text(`Private Memory of ${userName}  •  Exported on ${exportDateStr}`, margin, y);
    y += 8;

    pdf.setDrawColor(79, 70, 229);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;

    // --- ENTRY CONTENT ---
    // Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    const titleLines = pdf.splitTextToSize(entry.title || 'Untitled Memory', contentWidth);
    for (const line of titleLines) {
      checkPageOverflow(8);
      pdf.text(line, margin, y);
      y += 7;
    }
    y += 2;

    // Timestamp, Mood & Tags
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(100, 116, 139);
    const dateStr = entry.createdAt
      ? new Date(entry.createdAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Date unknown';
    const moodStr = entry.mood ? `  •  Mood: ${entry.mood}` : '';
    const tagsStr = entry.tags && entry.tags.length > 0 ? `  •  Tags: #${entry.tags.join(', #')}` : '';
    pdf.text(`${dateStr}${moodStr}${tagsStr}`, margin, y);
    y += 10;

    // Divider
    pdf.setDrawColor(241, 245, 249);
    pdf.setLineWidth(0.4);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Written Content
    if (entry.content) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      pdf.setTextColor(51, 65, 85); // Slate 700
      const contentLines = pdf.splitTextToSize(entry.content, contentWidth);

      for (const line of contentLines) {
        checkPageOverflow(6);
        pdf.text(line, margin, y);
        y += 5.8;
      }
      y += 8;
    }

    // Attached Images
    if (Array.isArray(entry.attachments) && entry.attachments.length > 0) {
      onProgress?.({
        status: 'fetching_images',
        currentStep: 'Embedding image attachments...',
        processedCount: 1,
        totalCount: 1,
      });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text('ATTACHED MEDIA', margin, y);
      y += 6;

      for (const att of entry.attachments) {
        if (att.type === 'image' && att.publicId) {
          checkPageOverflow(50);
          const imageData = await this.fetchImageAsBase64(att.publicId);

          if (imageData) {
            try {
              const maxImgWidth = Math.min(contentWidth, 130);
              const aspectRatio = imageData.height / imageData.width;
              const imgHeight = Math.min(maxImgWidth * aspectRatio, 90);
              const imgWidth = imgHeight / aspectRatio;

              const formatMatch = imageData.dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
              const rawFormat = formatMatch && formatMatch[1] ? formatMatch[1].toUpperCase() : 'JPEG';
              const imageFormat = rawFormat === 'PNG' ? 'PNG' : rawFormat === 'WEBP' ? 'WEBP' : 'JPEG';

              checkPageOverflow(imgHeight + 8);
              pdf.setDrawColor(226, 232, 240);
              pdf.rect(margin, y, imgWidth + 2, imgHeight + 2);
              pdf.addImage(imageData.dataUrl, imageFormat, margin + 1, y + 1, imgWidth, imgHeight);
              y += imgHeight + 8;
            } catch (imgErr) {
              console.warn('[PdfExport] Failed adding image to PDF:', imgErr);
              pdf.setFont('helvetica', 'italic');
              pdf.setFontSize(9);
              pdf.setTextColor(148, 163, 184);
              pdf.text('[Attached Image could not be embedded]', margin, y);
              y += 6;
            }
          } else {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(9);
            pdf.setTextColor(148, 163, 184);
            pdf.text('[Attached Image could not be loaded]', margin, y);
            y += 6;
          }
        }
      }
      y += 4;
    }

    // AI Analysis Insights
    if (entry.aiAnalysis) {
      const analysis = entry.aiAnalysis;
      checkPageOverflow(35);

      pdf.setFillColor(245, 243, 255); // Purple 50
      pdf.setDrawColor(221, 214, 254); // Purple 200
      pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(109, 40, 217); // Purple 700
      pdf.text('AI INSIGHTS & REFLECTION', margin + 4, y + 6.5);
      y += 14;

      if (analysis.overview) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text('Overview:', margin + 2, y);
        y += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(71, 85, 105);
        const overviewLines = pdf.splitTextToSize(analysis.overview, contentWidth - 4);
        for (const line of overviewLines) {
          checkPageOverflow(5);
          pdf.text(line, margin + 2, y);
          y += 5;
        }
        y += 3;
      }

      if (Array.isArray(analysis.emotions) && analysis.emotions.length > 0) {
        checkPageOverflow(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Emotions: ${analysis.emotions.join(', ')}`, margin + 2, y);
        y += 6;
      }

      if (Array.isArray(analysis.keyThemes) && analysis.keyThemes.length > 0) {
        checkPageOverflow(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Key Themes: ${analysis.keyThemes.join(', ')}`, margin + 2, y);
        y += 6;
      }

      if (Array.isArray(analysis.growthSignals) && analysis.growthSignals.length > 0) {
        checkPageOverflow(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text('Growth Signals:', margin + 2, y);
        y += 5;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        for (const signal of analysis.growthSignals) {
          checkPageOverflow(5);
          pdf.text(`• ${signal}`, margin + 6, y);
          y += 4.8;
        }
        y += 2;
      }

      if (Array.isArray(analysis.reflectionQuestions) && analysis.reflectionQuestions.length > 0) {
        checkPageOverflow(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        pdf.text('Reflection Questions:', margin + 2, y);
        y += 5;
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(9);
        pdf.setTextColor(109, 40, 217);
        for (const q of analysis.reflectionQuestions) {
          checkPageOverflow(5);
          pdf.text(`? ${q}`, margin + 6, y);
          y += 4.8;
        }
      }
    }

    // Page Numbers Footer
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `MindVault • Memory Reflection • ${userName} • Page ${p} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    onProgress?.({
      status: 'generating_pdf',
      currentStep: 'Downloading memory PDF...',
      processedCount: 1,
      totalCount: 1,
    });

    const cleanTitle = (entry.title || 'Memory').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    pdf.save(`MindVault_Memory_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);

    onProgress?.({
      status: 'completed',
      processedCount: 1,
      totalCount: 1,
    });
  }

  /**
   * Generates a beautifully formatted PDF document of ALL user journal entries
   */
  public static async exportJournalPdf(
    entries: JournalEntry[],
    userName: string,
    onProgress?: (progress: PdfExportProgress) => void
  ): Promise<void> {
    if (!entries || entries.length === 0) {
      throw new Error('No journal entries available to export.');
    }

    onProgress?.({
      status: 'initializing',
      currentStep: 'Preparing document layout...',
      processedCount: 0,
      totalCount: entries.length,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const checkPageOverflow = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(margin, margin - 5, pageWidth - margin, margin - 5);
        return true;
      }
      return false;
    };

    // --- COVER / HEADER SECTION ---
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(79, 70, 229); // Indigo 600
    pdf.text('My MindVault Journal', margin, y);
    y += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    const exportDateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    pdf.text(`Private Vault of ${userName}  •  Exported on ${exportDateStr}`, margin, y);
    y += 5;
    pdf.text(`Total Memories: ${entries.length}`, margin, y);
    y += 8;

    pdf.setDrawColor(79, 70, 229);
    pdf.setLineWidth(0.8);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 12;

    // --- SORT ENTRIES CHRONOLOGICALLY (NEWEST FIRST) ---
    const sortedEntries = [...entries].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    // --- LOOP THROUGH ENTRIES ---
    for (let index = 0; index < sortedEntries.length; index++) {
      const entry = sortedEntries[index];

      onProgress?.({
        status: 'fetching_images',
        currentStep: `Processing entry ${index + 1} of ${sortedEntries.length}: "${entry.title || 'Untitled'}"`,
        processedCount: index + 1,
        totalCount: sortedEntries.length,
      });

      checkPageOverflow(35);

      // Entry Card Banner
      pdf.setFillColor(248, 250, 252); // Slate 50
      pdf.setDrawColor(226, 232, 240); // Slate 200
      pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

      // Entry Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(15, 23, 42);
      const titleText = entry.title || 'Untitled Memory';
      const truncatedTitle = pdf.splitTextToSize(titleText, contentWidth - 45)[0];
      pdf.text(truncatedTitle, margin + 4, y + 9);

      // Date & Mood Pill inside banner
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      const dateStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Date unknown';
      const moodText = entry.mood ? ` • Mood: ${entry.mood}` : '';
      pdf.text(`${dateStr}${moodText}`, pageWidth - margin - 4, y + 9, { align: 'right' });

      y += 18;

      // Written Content
      if (entry.content) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(51, 65, 85);
        const contentLines = pdf.splitTextToSize(entry.content, contentWidth - 4);

        for (const line of contentLines) {
          checkPageOverflow(6);
          pdf.text(line, margin + 2, y);
          y += 5.5;
        }
        y += 4;
      }

      // Attached Images
      if (Array.isArray(entry.attachments) && entry.attachments.length > 0) {
        for (const att of entry.attachments) {
          if (att.type === 'image' && att.publicId) {
            checkPageOverflow(50);
            const imageData = await this.fetchImageAsBase64(att.publicId);

            if (imageData) {
              try {
                const maxImgWidth = Math.min(contentWidth - 8, 120);
                const aspectRatio = imageData.height / imageData.width;
                const imgHeight = Math.min(maxImgWidth * aspectRatio, 80);
                const imgWidth = imgHeight / aspectRatio;

                const formatMatch = imageData.dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
                const rawFormat = formatMatch && formatMatch[1] ? formatMatch[1].toUpperCase() : 'JPEG';
                const imageFormat = rawFormat === 'PNG' ? 'PNG' : rawFormat === 'WEBP' ? 'WEBP' : 'JPEG';

                checkPageOverflow(imgHeight + 10);
                pdf.setDrawColor(226, 232, 240);
                pdf.rect(margin + 2, y, imgWidth + 2, imgHeight + 2);
                pdf.addImage(imageData.dataUrl, imageFormat, margin + 3, y + 1, imgWidth, imgHeight);
                y += imgHeight + 8;
              } catch (imgErr) {
                console.warn('[PdfExport] Failed adding image to PDF:', imgErr);
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(8.5);
                pdf.setTextColor(148, 163, 184);
                pdf.text('[Attached Image could not be embedded]', margin + 2, y);
                y += 5;
              }
            } else {
              pdf.setFont('helvetica', 'italic');
              pdf.setFontSize(8.5);
              pdf.setTextColor(148, 163, 184);
              pdf.text('[Attached Image could not be loaded]', margin + 2, y);
              y += 5;
            }
          }
        }
      }

      // AI Analysis Insights
      if (entry.aiAnalysis) {
        const analysis = entry.aiAnalysis;
        checkPageOverflow(30);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.setTextColor(109, 40, 217);
        pdf.text('AI INSIGHTS & REFLECTION', margin + 4, y + 5);
        y += 8;

        if (analysis.overview) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          const overviewLines = pdf.splitTextToSize(analysis.overview, contentWidth - 10);
          for (const line of overviewLines) {
            checkPageOverflow(5);
            pdf.text(line, margin + 6, y);
            y += 4.5;
          }
        }

        if (Array.isArray(analysis.emotions) && analysis.emotions.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Emotions: ${analysis.emotions.join(', ')}`, margin + 6, y + 2);
          y += 6;
        }

        if (Array.isArray(analysis.keyThemes) && analysis.keyThemes.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8.5);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Themes: ${analysis.keyThemes.join(', ')}`, margin + 6, y + 2);
          y += 6;
        }

        y += 4;
      }

      // Entry Separator Line
      checkPageOverflow(10);
      pdf.setDrawColor(241, 245, 249);
      pdf.setLineWidth(0.4);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    // --- FOOTER & PAGE NUMBERS ---
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `MindVault Journal • ${userName} • Page ${p} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    }

    onProgress?.({
      status: 'generating_pdf',
      currentStep: 'Finalizing PDF download...',
      processedCount: sortedEntries.length,
      totalCount: sortedEntries.length,
    });

    const filename = `MindVault_Journal_${userName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(filename);

    onProgress?.({
      status: 'completed',
      processedCount: sortedEntries.length,
      totalCount: sortedEntries.length,
    });
  }
}
