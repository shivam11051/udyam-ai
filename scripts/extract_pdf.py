from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path('Writings/SIH_2026_All_PS.pdf')
text_path = pdf_path.with_suffix('.txt')

reader = PdfReader(str(pdf_path))
with open(text_path, 'w', encoding='utf-8') as f:
    for page in reader.pages:
        try:
            f.write(page.extract_text() or '')
            f.write('\n\n')
        except Exception as e:
            f.write(f'-- Error extracting page: {e}\n')

print(f'Wrote text to {text_path}')
