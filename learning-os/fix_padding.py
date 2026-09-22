import re

with open('app/globals.css', 'r') as f:
    css = f.read()

css = re.sub(r'\.main \{ padding: 34px 40px 80px;', '.main { padding: 90px 40px 80px;', css)

# Just in case there are other .main definitions
css = css.replace('padding: 22px 16px 60px;', 'padding: 90px 16px 60px;')

with open('app/globals.css', 'w') as f:
    f.write(css)
