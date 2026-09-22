with open('lib/core/concepts.ts', 'r') as f:
    content = f.read()

replacement = """    prereqs: input.prereqs ?? [],
    goal: input.goal ?? '',
    success_condition: input.success_condition ?? '',
    failure_condition: input.failure_condition ?? '',
    notes: input.notes ?? [],"""

content = content.replace("    prereqs: input.prereqs ?? [],\n    notes: input.notes ?? [],", replacement)

with open('lib/core/concepts.ts', 'w') as f:
    f.write(content)
