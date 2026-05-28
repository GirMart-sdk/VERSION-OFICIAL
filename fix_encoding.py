#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# Limpiar codificación de app.js
with open('app.js', 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# Reemplazos de caracteres rotos
text = text.replace('estÃ¡', 'está')
text = text.replace('vacÃ­o', 'vacío')
text = text.replace('envÃ­o', 'envío')
text = text.replace('dÃ­as', 'días')
text = text.replace('mÃ©todo', 'método')
text = text.replace('Ã©', 'é')
text = text.replace('â€¢', '•')
text = text.replace('â€"', '-')
text = text.replace('â"€', '-')
text = text.replace('WINNER STORE â€– app.js', 'WINNER STORE - app.js')

# Escribir con UTF-8 limpio
with open('app.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('✅ Archivo corregido')
