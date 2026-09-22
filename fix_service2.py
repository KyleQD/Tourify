import sys

filepath = sys.argv[1]
with open(filepath, 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'copy("quick_start_completed_at")' in line:
        print(f"Found at line {i+1}: {repr(line)}")
        # Insert after this line
        indent = line[:len(line) - len(line.lstrip())]
        lines.insert(i+1, indent + 'copy("schedule_details")\n')
        print("Inserted schedule_details copy")
        break
else:
    print("quick_start_completed_at not found")

with open(filepath, 'w') as f:
    f.writelines(lines)
