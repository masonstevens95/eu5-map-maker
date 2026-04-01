#!/usr/bin/env python3
"""Convert melted .txt files to .json, handling Clausewitz key=value format."""
import os, json, re, sys

DIR = "melted"

def parse_block(lines, idx):
    """Parse a { ... } block, returns (value, new_idx)."""
    idx += 1  # skip the { line
    
    # Peek ahead to determine if object or array
    # Object: has "key = value" lines. Array: has bare values.
    is_obj = False
    for j in range(idx, min(idx + 5, len(lines))):
        l = lines[j].strip()
        if l == "}" or l == "{" or l == "":
            continue
        if " = " in l or l.endswith(" ="):
            is_obj = True
        break
    
    if is_obj:
        obj = {}
        while idx < len(lines):
            line = lines[idx].strip()
            if line == "}":
                return obj, idx + 1
            if line == "" or line == "{":
                idx += 1
                continue
            
            if " = " in line:
                key, val = line.split(" = ", 1)
                key = key.strip()
                # Check if next line is {
                if idx + 1 < len(lines) and lines[idx + 1].strip() == "{":
                    idx += 1
                    parsed, idx = parse_block(lines, idx)
                    if key in obj:
                        # Duplicate key — convert to list
                        if isinstance(obj[key], list):
                            obj[key].append(parsed)
                        else:
                            obj[key] = [obj[key], parsed]
                    else:
                        obj[key] = parsed
                else:
                    pv = parse_value(val)
                    if key in obj:
                        if isinstance(obj[key], list):
                            obj[key].append(pv)
                        else:
                            obj[key] = [obj[key], pv]
                    else:
                        obj[key] = pv
                    idx += 1
            elif line.endswith(" ="):
                key = line[:-2].strip()
                if idx + 1 < len(lines) and lines[idx + 1].strip() == "{":
                    idx += 1
                    parsed, idx = parse_block(lines, idx)
                    if key in obj:
                        if isinstance(obj[key], list):
                            obj[key].append(parsed)
                        else:
                            obj[key] = [obj[key], parsed]
                    else:
                        obj[key] = parsed
                else:
                    obj[key] = None
                    idx += 1
            else:
                # bare value inside what we thought was object
                obj[line] = True
                idx += 1
        return obj, idx
    else:
        # Array
        arr = []
        while idx < len(lines):
            line = lines[idx].strip()
            if line == "}":
                return arr, idx + 1
            if line == "":
                idx += 1
                continue
            if line == "{":
                parsed, idx = parse_block(lines, idx)
                arr.append(parsed)
            else:
                arr.append(parse_value(line))
                idx += 1
        return arr, idx

def parse_value(s):
    s = s.strip()
    if s == "yes": return True
    if s == "no": return False
    if s.startswith('"') and s.endswith('"'):
        return s[1:-1]
    try:
        if "." in s:
            return float(s)
        return int(s)
    except ValueError:
        return s

def convert_file(txt_path, json_path):
    with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    
    # Parse top level
    result = {}
    idx = 0
    while idx < len(lines):
        line = lines[idx].strip()
        if line == "" or line == "{" or line == "}":
            idx += 1
            continue
        
        if " = " in line:
            key, val = line.split(" = ", 1)
            key = key.strip()
            if idx + 1 < len(lines) and lines[idx + 1].strip() == "{":
                idx += 1
                parsed, idx = parse_block(lines, idx)
                if key in result:
                    if isinstance(result[key], list):
                        result[key].append(parsed)
                    else:
                        result[key] = [result[key], parsed]
                else:
                    result[key] = parsed
            else:
                result[key] = parse_value(val)
                idx += 1
        elif line.endswith(" ="):
            key = line[:-2].strip()
            if idx + 1 < len(lines) and lines[idx + 1].strip() == "{":
                idx += 1
                parsed, idx = parse_block(lines, idx)
                if key in result:
                    if isinstance(result[key], list):
                        result[key].append(parsed)
                    else:
                        result[key] = [result[key], parsed]
                else:
                    result[key] = parsed
            else:
                result[key] = None
                idx += 1
        else:
            idx += 1
    
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False)

# Process all txt files
files = sorted([f for f in os.listdir(DIR) if f.endswith(".txt")])
print(f"Converting {len(files)} files...")

for i, fname in enumerate(files):
    txt_path = os.path.join(DIR, fname)
    json_path = os.path.join(DIR, fname.replace(".txt", ".json"))
    size_mb = os.path.getsize(txt_path) / 1024 / 1024
    
    if size_mb > 100:
        print(f"  SKIP {fname} ({size_mb:.0f} MB — too large for Python dict)")
        continue
    
    sys.stdout.write(f"  {fname} ({size_mb:.1f} MB)...")
    sys.stdout.flush()
    try:
        convert_file(txt_path, json_path)
        json_size = os.path.getsize(json_path) / 1024 / 1024
        print(f" → {json_size:.1f} MB JSON")
    except RecursionError:
        print(f" SKIP (too deeply nested)")
    except Exception as e:
        print(f" ERROR: {e}")

print("\nDone.")
