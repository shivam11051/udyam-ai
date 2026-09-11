from pathlib import Path
from PyPDF2 import PdfReader

# Path to the PS26091 PDF in the Writings folder (filename contains spaces)
pdf_path = Path('Writings/Problem Statement ID - PS26091 Problem Statement Title - AI Driven Hyper Local Business Advisory and Financial Structuring Assistant for Rural Micro-Entrepreneurs Theme - FinTech & Financial Inclu.pdf')
text_path = pdf_path.with_suffix('.txt')

reader = PdfReader(str(pdf_path))
with open(text_path, 'w', encoding='utf-8') as f:
    for i, page in enumerate(reader.pages, start=1):
        try:
            f.write(page.extract_text() or '')
            f.write('\n\n')
        except Exception as e:
            f.write(f'-- Error extracting page {i}: {e}\n')

print(f'Wrote text to {text_path}')
