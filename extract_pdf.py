import pypdf

reader = pypdf.PdfReader("c:/knowledge/internship/CMS/BRD_FRS_CMS.pdf")
print(f"Number of pages: {len(reader.pages)}")

text = ""
for i, page in enumerate(reader.pages):
    text += f"--- PAGE {i+1} ---\n"
    text += page.extract_text() + "\n"

with open("c:/knowledge/internship/CMS/docs/BRD_FRS_CMS.txt", "w", encoding="utf-8") as f:
    f.write(text)

print("Done extracting!")
