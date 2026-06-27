# th-checkers-js

เกมหมากฮอสไทย (Thai Checkers) พัฒนาด้วย HTML และ JavaScript ล้วน

- กติกาการเล่น → ดูที่ [`docs/RULES.md`](docs/RULES.md)
- โค้ดเอนจินอยู่ใน [`core/`](core/)
- CLI อยู่ใน [`cli/`](cli/)
- Web UI อยู่ใน [`web/`](web/)

---

## การติดตั้งและรัน

```bash
npm install      # ติดตั้ง dependencies
npm test         # รันชุดทดสอบทั้งหมด (Jest)
npm run demo     # รันเดโมบนเทอร์มินัล (node cli/main.js)
```

โครงสร้างโค้ดหลักอยู่ใน [`core/`](core/) (เอนจินที่ไม่ผูกกับ UI) และ [`cli/`](cli/) (การแสดงผล/REPL)

| ไฟล์ | หน้าที่ |
|------|---------|
| [`core/Board.js`](core/Board.js) | กระดานแบบ bitboard และการแปลงสถานะ |
| [`core/Position.js`](core/Position.js) | พิกัดช่องบนกระดาน (0–31) |
| [`core/Piece.js`](core/Piece.js) | นิยามสี/ชนิดของหมาก |
| [`core/Explorer.js`](core/Explorer.js) | การสร้างตาเดินและตากินตามกติกา |
| [`core/Legals.js`](core/Legals.js) | คอนเทนเนอร์ของตาเดินที่ถูกกติกา |
| [`core/Game.js`](core/Game.js) | สเตตแมชชีนของเกม (เดิน/ย้อน/ตาใคร) |
