with open('app/globals.css', 'r') as f:
    css = f.read()

anim_css = """
/* Dashboard Animations */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.tile, .card {
  animation: fadeInUp 0.4s ease forwards;
  opacity: 0;
}

.tile:nth-child(1) { animation-delay: 0.05s; }
.tile:nth-child(2) { animation-delay: 0.1s; }
.tile:nth-child(3) { animation-delay: 0.15s; }
.tile:nth-child(4) { animation-delay: 0.2s; }
.tile:nth-child(5) { animation-delay: 0.25s; }

.cardlist .card:nth-child(1) { animation-delay: 0.1s; }
.cardlist .card:nth-child(2) { animation-delay: 0.15s; }
.cardlist .card:nth-child(3) { animation-delay: 0.2s; }
.cardlist .card:nth-child(4) { animation-delay: 0.25s; }
.cardlist .card:nth-child(5) { animation-delay: 0.3s; }

/* Dashboard Responsiveness */
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}
@media (max-width: 768px) {
  .main { padding: 90px 16px 40px; }
  .tiles { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
  .quest-panel { padding: 20px !important; }
}
"""

css += "\n" + anim_css

with open('app/globals.css', 'w') as f:
    f.write(css)
