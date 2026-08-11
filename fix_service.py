import sys

filepath = sys.argv[1]
with open(filepath, 'r') as f:
    content = f.read()

# Edit 1: Add copy("schedule_details") before return settings
old1 = '  copy("quick_start_completed_at")\n  return settings'
new1 = '  copy("quick_start_completed_at")\n  copy("schedule_details")\n  return settings'
if old1 in content:
    content = content.replace(old1, new1, 1)
    print("Edit 1 applied")
else:
    print("Edit 1 FAILED - old string not found")

# Edit 2: Add schedule_details to presentEvent return
old2 = '    settings,\n    readiness: getEventReadiness({'
new2 = '    settings,\n    schedule_details: settings.schedule_details ?? null,\n    readiness: getEventReadiness({'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print("Edit 2 applied")
else:
    print("Edit 2 FAILED - old string not found")

with open(filepath, 'w') as f:
    f.write(content)
