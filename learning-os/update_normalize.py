import re

with open('lib/core/concepts.ts', 'r') as f:
    content = f.read()

new_fields = """    prereqs: (data.prereqs as string[]) ?? [],
    goal: (data.goal as string) ?? '',
    success_condition: (data.success_condition as string) ?? '',
    failure_condition: (data.failure_condition as string) ?? '','""\"
"""
# Actually, I'll just use string replacement on "prereqs: (data.prereqs as string[]) ?? [],"
content = content.replace(
    "prereqs: (data.prereqs as string[]) ?? [],",
    "prereqs: (data.prereqs as string[]) ?? [],\n    goal: (data.goal as string) ?? '',\n    success_condition: (data.success_condition as string) ?? '',\n    failure_condition: (data.failure_condition as string) ?? '',"
)

# Also update saveConcept
# function saveConcept(c: Concept) { ...
#   const { body, extra, ...data } = c;
#   writeMd(conceptFile(c.id), { ...data, ...extra }, body);
# }
# Since saveConcept spreads `data`, it should automatically include the new fields. Let's verify.

with open('lib/core/concepts.ts', 'w') as f:
    f.write(content)
