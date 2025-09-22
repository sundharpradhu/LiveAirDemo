# merge_html_merge_arrays.py
from bs4 import BeautifulSoup
import re, json, sys, os

def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

def merge_files(file1, file2, output_file):
    html1 = read_file(file1)
    html2 = read_file(file2)

    soup1 = BeautifulSoup(html1, "html.parser")
    soup2 = BeautifulSoup(html2, "html.parser")

    # Merge head: append tags from soup2.head (skip duplicate <title>)
    if soup2.head:
        for tag in soup2.head.contents:
            if getattr(tag, "name", None) == "title":
                continue
            soup1.head.append(tag)

    # Merge body contents: append everything from soup2.body into soup1.body
    if soup1.body and soup2.body:
        for elem in soup2.body.contents:
            soup1.body.append(elem)

    merged_html = str(soup1)

    # Helpers to find JS array declarations
    def find_arrays_in_text(text, varname):
        pattern = re.compile(r'\b(?:var|let|const)\s+' + re.escape(varname) + r'\s*=\s*\[', re.MULTILINE)
        matches = []
        for m in pattern.finditer(text):
            start_bracket = text.find('[', m.start())
            if start_bracket == -1:
                continue
            i = start_bracket
            depth = 0
            end_index = None
            while i < len(text):
                if text[i] == '[':
                    depth += 1
                elif text[i] == ']':
                    depth -= 1
                    if depth == 0:
                        end_index = i
                        break
                i += 1
            if end_index:
                array_text = text[start_bracket:end_index+1]
                matches.append((m.start(), end_index+1, array_text))
        return matches

    def parse_array_text(array_text):
        txt = array_text.strip()
        txt = re.sub(r',\s*\]', ']', txt, flags=re.MULTILINE)
        try:
            return json.loads(txt)
        except Exception:
            txt2 = txt.replace("'", '"')
            txt2 = re.sub(r',\s*\]', ']', txt2, flags=re.MULTILINE)
            try:
                return json.loads(txt2)
            except Exception:
                txt3 = txt2.replace('undefined', 'null')
                try:
                    return json.loads(txt3)
                except Exception:
                    return None

    array_names = ["customers", "roles", "supportTickets", "deliveryPartners"]
    collected = {name: [] for name in array_names}
    remove_ranges = []

    for name in array_names:
        occurrences = find_arrays_in_text(merged_html, name)
        if occurrences:
            for (s,e,arr_text) in occurrences:
                parsed = parse_array_text(arr_text)
                if parsed is not None:
                    collected[name].append(parsed)
                    remove_ranges.append((s,e))
                else:
                    # skip removal if parse failed
                    pass

    merged_arrays_js = []
    for name in array_names:
        lists = collected.get(name, [])
        if not lists:
            continue
        merged_map = {}
        for lst in lists:
            for item in lst:
                if isinstance(item, dict) and 'id' in item:
                    key = item['id']
                    if key not in merged_map:
                        merged_map[key] = item.copy()
                    else:
                        merged_map[key].update(item)
                else:
                    key = json.dumps(item, sort_keys=True)
                    if key not in merged_map:
                        merged_map[key] = item
        items = list(merged_map.values())
        # try to sort by numeric id where possible
        try:
            if all(isinstance(it, dict) and 'id' in it for it in items):
                items.sort(key=lambda x: (isinstance(x['id'], int), x['id']))
        except Exception:
            pass
        merged_js = "let " + name + " = " + json.dumps(items, indent=4, ensure_ascii=False) + ";"
        merged_arrays_js.append(merged_js)

    if remove_ranges:
        new_html = merged_html
        for s,e in sorted(remove_ranges, key=lambda x: x[0], reverse=True):
            new_html = new_html[:s] + new_html[e:]
    else:
        new_html = merged_html

    soup_new = BeautifulSoup(new_html, "html.parser")
    if merged_arrays_js:
        combined_js = "\n\n".join(merged_arrays_js) + "\n"
        script_tag = soup_new.new_tag("script")
        script_tag.string = combined_js
        if soup_new.head:
            soup_new.head.append(script_tag)
        elif soup_new.body:
            soup_new.body.insert(0, script_tag)
        else:
            soup_new.append(script_tag)

    final_html = str(soup_new)
    write_file(output_file, final_html)
    return output_file

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Merge two HTML files and merge common JS arrays by id.")
    p.add_argument("file1", help="First HTML file (base)")
    p.add_argument("file2", help="Second HTML file to merge into first")
    p.add_argument("--out", "-o", default="merged.html", help="Output merged file")
    args = p.parse_args()
    out = merge_files(args.file1, args.file2, args.out)
    print("Merged file created:", out)
