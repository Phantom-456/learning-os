import re

with open('lib/core/concepts.ts', 'r') as f:
    content = f.read()

replacement = """    status: c.status,
    review: c.review,
    prereqs: c.prereqs,
    goal: c.goal,
    success_condition: c.success_condition,
    failure_condition: c.failure_condition,
    notes: c.notes,"""

content = re.sub(r'    status: c.status,\n    review: c.review,\n    prereqs: c.prereqs,\n    notes: c.notes,', replacement, content)

# I should also check createConcept to make sure it includes the defaults for the new fields
#   const c: Concept = { ... }

with open('lib/core/concepts.ts', 'w') as f:
    f.write(content)
