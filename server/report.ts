
import PDFDocument from "pdfkit";
import type { Conversation, Message, ScamReport } from "@shared/schema";

export async function generatePDFReport(
  conversation: Conversation, 
  messages: Message[], 
  reports: ScamReport[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    // === Report Header ===
    doc.fontSize(25).text('Scam Interaction Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Report Generated: ${new Date().toLocaleString()}`);
    doc.text(`Conversation ID: ${conversation.id}`);
    doc.text(`Title: ${conversation.title}`);
    doc.text(`Scam Score: ${conversation.scamScore || 0}/100`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // === Executive Summary / Intel ===
    doc.fontSize(18).text('Extracted Intelligence Summary');
    doc.moveDown(0.5);
    
    if (reports.length === 0) {
        doc.fontSize(12).text('No specific intelligence (UPI, Bank, URL) detected yet.');
    } else {
        const categories = ['upi', 'bank_account', 'url', 'phone', 'crypto'];
        categories.forEach(cat => {
            const catReports = reports.filter(r => r.intelType === cat);
            if (catReports.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text(cat.toUpperCase().replace('_', ' '));
                catReports.forEach(report => {
                    doc.fontSize(12).font('Helvetica').text(`- Value: ${report.intelValue}`);
                    doc.fontSize(10).fillColor('gray').text(`  Context: ${report.context}`);
                    doc.fillColor('black');
                });
                doc.moveDown(0.5);
            }
        });
    }
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // === Transcript ===
    doc.fontSize(18).text('Conversation Transcript');
    doc.moveDown(0.5);

    messages.forEach(msg => {
        const timestamp = new Date(msg.createdAt!).toLocaleTimeString();
        const sender = msg.sender.toUpperCase();
        
        doc.fontSize(10).fillColor('gray').text(`[${timestamp}] ${sender}:`);
        doc.fontSize(12).fillColor('black').text(msg.content);
        
        // If agent, show reasoning (for admin transparency)
        if (msg.sender === 'agent' && msg.metadata) {
            const meta = msg.metadata as any;
            if (meta.emotion || meta.reasoning) {
                doc.fontSize(10).fillColor('blue')
                   .text(`[Internal State] Emotion: ${meta.emotion} | Reasoning: ${meta.reasoning}`, { indent: 20 });
            }
        }
        doc.moveDown(0.5);
        doc.fillColor('black');
    });

    doc.end();
  });
}
