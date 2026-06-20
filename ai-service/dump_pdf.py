import pypdf

reader = pypdf.PdfReader("BRD_FRS_CMS.pdf")
print("Total pages:", len(reader.pages))
for i in range(min(5, len(reader.pages))):
    page = reader.pages[i]
    text = page.extract_text()
    print(f"--- Page {i+1} Text Length: {len(text) if text else 0} ---")
    if text:
        print(text[:500])
