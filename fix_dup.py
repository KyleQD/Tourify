import sys

filepath = sys.argv[1]
with open(filepath, 'r') as f:
    lines = f.readlines()

# Find and remove duplicate schedule_details copy
found = []
for i, line in enumerate(lines):
    if 'copy("schedule_details")' in line:
        found.append(i)

if len(found) > 1:
    # Remove the second occurrence
    del lines[found[1]]
    print(f"Removed duplicate at line {found[1]+1}")
else:
    print(f"Found {len(found)} occurrences")

with open(filepath, 'w') as f:
    f.writelines(lines)
