import json, sys

with open("scripts/seed-pinyin-dict.ts", "r") as f:
    base = f.read()

with open(sys.argv[1], "r") as f:
    ext = json.load(f)

# 在 DICT 最后一个 } 前插入
last_entry = base.rfind("\n  }", 0, base.rfind("\n};"))
insert_lines = []
for phrase, entry in ext.items():
    src = f', source: "{entry["source"]}"' if entry.get("source") else ""
    insert_lines.append(f'  "{phrase}": {{ pinyin: "{entry["pinyin"]}", category: "{entry["category"]}"{src} }},')

insert_text = "\n" + "\n".join(insert_lines) + "\n"
new_base = base[:last_entry] + insert_text + base[last_entry:]

with open("scripts/seed-pinyin-dict.ts", "w") as f:
    f.write(new_base)

print(f"Merged {len(insert_lines)} entries")
