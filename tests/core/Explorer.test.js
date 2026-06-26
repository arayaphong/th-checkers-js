// Comprehensive port of C++ Catch2 tests from ExplorerTest.cpp
// — 17 TEST_CASE blocks, 37 SECTIONs, 842 lines faithfully ported to Jest/JavaScript

import { describe, expect, test } from '@jest/globals';
import { Explorer } from '../../core/Explorer.js';
import { Board } from '../../core/Board.js';
import { Position } from '../../core/Position.js';
import { PieceColor, PieceType } from '../../core/Piece.js';

// ─── helper: build a Pieces Map from entries ───
function pieces(...entries) {
  const m = new Map();
  for (const [coord, color, type] of entries) {
    m.set(Position.fromString(coord), { color, type });
  }
  return m;
}

// ─── helper: collect all target positions into a Set of coordinate strings ───
function collectPositions(legals) {
  const set = new Set();
  for (let i = 0; i < legals.size(); i++) {
    set.add(legals.getPosition(i).toString());
  }
  return set;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Basic movement tests") — 4 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Basic movement tests', () => {
  // ── 1. "White pion normal moves" ──
  test('White pion normal moves', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(pieces(['C4', PieceColor.WHITE, PieceType.PION]));
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(false);
    expect(options.size()).toBe(2);

    const positions = collectPositions(options);
    expect(positions.has('B3')).toBe(true);
    expect(positions.has('D3')).toBe(true);
  });

  // ── 2. "Black pion normal moves" ──
  test('Black pion normal moves', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(pieces(['C4', PieceColor.BLACK, PieceType.PION]));
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(false);
    expect(options.size()).toBe(2);

    const positions = collectPositions(options);
    expect(positions.has('B5')).toBe(true);
    expect(positions.has('D5')).toBe(true);
  });

  // ── 3. "White dame normal moves" ──
  test('White dame normal moves', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(pieces(['C4', PieceColor.WHITE, PieceType.DAME]));
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(false);
    expect(options.size()).toBeGreaterThanOrEqual(2);

    const positions = collectPositions(options);
    expect(positions.has('B3')).toBe(true);
    expect(positions.has('D3')).toBe(true);
  });

  // ── 4. "Blocked moves" ──
  test('Blocked moves', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
        ['D3', PieceColor.WHITE, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Pion capture tests") — 2 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Pion capture tests', () => {
  // ── 5. "Single capture - white pion captures black" ──
  test('Single capture - white pion captures black', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.size()).toBe(1);

    const targetPosition = options.getPosition(0);
    const capturedPieces = options.getCapturePieces(0);

    expect(capturedPieces.length).toBe(1);
    expect(capturedPieces[0].equals(Position.fromString('B3'))).toBe(true);
    expect(targetPosition.equals(Position.fromString('A2'))).toBe(true);
  });

  // ── 6. "Multiple capture opportunities" ──
  test('Multiple capture opportunities', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
        ['D3', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.size()).toBe(2);

    let foundB3Capture = false;
    let foundD3Capture = false;

    for (let i = 0; i < options.size(); i++) {
      const targetPosition = options.getPosition(i);
      const capturedPieces = options.getCapturePieces(i);

      expect(capturedPieces.length).toBe(1);
      if (
        capturedPieces[0].equals(Position.fromString('B3')) &&
        targetPosition.equals(Position.fromString('A2'))
      ) {
        foundB3Capture = true;
      }
      if (
        capturedPieces[0].equals(Position.fromString('D3')) &&
        targetPosition.equals(Position.fromString('E2'))
      ) {
        foundD3Capture = true;
      }
    }

    expect(foundB3Capture).toBe(true);
    expect(foundD3Capture).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Dame capture tests") — 2 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Dame capture tests', () => {
  // ── 7. "Dame long-range capture" ──
  test('Dame long-range capture', () => {
    const focus = Position.fromString('B1');
    const board = Board.fromPieces(
      pieces(
        ['B1', PieceColor.WHITE, PieceType.DAME],
        ['D3', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.size()).toBe(1);

    const targetPosition = options.getPosition(0);
    const capturedPieces = options.getCapturePieces(0);

    expect(capturedPieces.length).toBe(1);
    expect(capturedPieces[0].equals(Position.fromString('D3'))).toBe(true);
    expect(targetPosition.equals(Position.fromString('E4'))).toBe(true);
  });

  // ── 8. "Dame multiple direction captures" ──
  test('Dame multiple direction captures', () => {
    const focus = Position.fromString('E4');
    const board = Board.fromPieces(
      pieces(
        ['E4', PieceColor.WHITE, PieceType.DAME],
        ['D3', PieceColor.BLACK, PieceType.PION],
        ['F3', PieceColor.BLACK, PieceType.PION],
        ['D5', PieceColor.BLACK, PieceType.PION],
        ['F5', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.size()).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Error handling tests") — 3 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Error handling tests', () => {
  // ── 9. "Empty position throws exception" ──
  test('Empty position throws exception', () => {
    const emptyPos = Position.fromString('E6');
    const board = Board.fromPieces(
      pieces(['C4', PieceColor.WHITE, PieceType.PION]),
    );
    const analyzer = new Explorer(board);

    expect(() => analyzer.findValidMoves(emptyPos)).toThrow();
  });

  // ── 10. "Invalid position throws exception" ──
  test('Invalid position throws exception', () => {
    const board = Board.fromPieces(
      pieces(['C4', PieceColor.WHITE, PieceType.PION]),
    );
    const analyzer = new Explorer(board);

    // E4 is empty (no piece there) — should throw
    expect(() => analyzer.findValidMoves(Position.fromString('E4'))).toThrow();
  });

  // ── 11. "Mixed piece types on board" ──
  test('Mixed piece types on board', () => {
    const pionFocus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['E4', PieceColor.BLACK, PieceType.DAME],
        ['B3', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const pionOptions = analyzer.findValidMoves(pionFocus);
    expect(pionOptions.empty()).toBe(false);

    const dameOptions = analyzer.findValidMoves(Position.fromString('E4'));
    expect(dameOptions.empty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Movement range comparison") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Movement range comparison', () => {
  // ── 12. "Dame vs Pion movement range" ──
  test('Dame vs Pion movement range', () => {
    const focus = Position.fromString('C4');

    const pionBoard = Board.fromPieces(
      pieces(['C4', PieceColor.WHITE, PieceType.PION]),
    );
    const pionAnalyzer = new Explorer(pionBoard);
    const pionOptions = pionAnalyzer.findValidMoves(focus);

    const dameBoard = Board.fromPieces(
      pieces(['C4', PieceColor.WHITE, PieceType.DAME]),
    );
    const dameAnalyzer = new Explorer(dameBoard);
    const dameOptions = dameAnalyzer.findValidMoves(focus);

    expect(pionOptions.hasCaptured()).toBe(false);
    expect(dameOptions.hasCaptured()).toBe(false);

    expect(pionOptions.size()).toBe(2);
    expect(dameOptions.size()).toBeGreaterThanOrEqual(pionOptions.size());

    const pionPositions = collectPositions(pionOptions);
    const damePositions = collectPositions(dameOptions);

    // All pion moves should also be valid dame moves
    for (const pos of pionPositions) {
      expect(damePositions.has(pos)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Advanced capture scenarios") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Advanced capture scenarios', () => {
  // ── 13. "Chain capture setup" ──
  test('Chain capture setup', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
        ['C2', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);

    if (options.hasCaptured()) {
      expect(options.empty()).toBe(false);

      // Check if any sequence has multiple captures
      let foundChain = false;
      for (let i = 0; i < options.size(); i++) {
        const capturedPieces = options.getCapturePieces(i);
        if (capturedPieces.length > 1) {
          foundChain = true;
          break;
        }
      }
      // For this specific setup, there shouldn't be chain captures available
      expect(foundChain).toBe(false);
    }
  });

  test('Pion capture into promotion row ends turn immediately', () => {
    const focus = Position.fromString('B3');
    const board = Board.fromPieces(
      pieces(
        ['B3', PieceColor.WHITE, PieceType.PION],
        ['C2', PieceColor.BLACK, PieceType.PION],
        ['E2', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.size()).toBe(1);

    const targetPosition = options.getPosition(0);
    const capturedPieces = options.getCapturePieces(0);

    expect(targetPosition.equals(Position.fromString('D1'))).toBe(true);
    expect(capturedPieces.map(pos => pos.toString())).toEqual(['C2']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Pion Edge case tests") — 4 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Pion Edge case tests', () => {
  // ── 14. "Board boundaries" ──
  test('Board boundaries', () => {
    const edgePos = Position.fromString('A2');
    const board = Board.fromPieces(
      pieces(['A2', PieceColor.BLACK, PieceType.PION]),
    );
    const analyzer = new Explorer(board);

    const edgeOptions = analyzer.findValidMoves(edgePos);
    expect(edgeOptions.hasCaptured()).toBe(false);
    expect(edgeOptions.size()).toBe(1);
    expect(edgeOptions.getPosition(0).equals(Position.fromString('B3'))).toBe(true);
  });

  // ── 15. "Corner position behavior" ──
  test('Corner position behavior', () => {
    const cornerPos = Position.fromString('G6');
    const board = Board.fromPieces(
      pieces(['G6', PieceColor.WHITE, PieceType.PION]),
    );
    const analyzer = new Explorer(board);

    const cornerOptions = analyzer.findValidMoves(cornerPos);
    expect(cornerOptions.hasCaptured()).toBe(false);
    expect(cornerOptions.size()).toBeLessThanOrEqual(2);
  });

  // ── 16. "Color dependent directions" ──
  test('Color dependent directions', () => {
    // White piece moving forward (up — decreasing y)
    const whitePos = Position.fromString('C4');
    const whiteBoard = Board.fromPieces(
      pieces(['C4', PieceColor.WHITE, PieceType.PION]),
    );
    const whiteAnalyzer = new Explorer(whiteBoard);

    const whiteOptions = whiteAnalyzer.findValidMoves(whitePos);
    expect(whiteOptions.hasCaptured()).toBe(false);

    const whiteMoves = collectPositions(whiteOptions);
    expect(whiteMoves.has('B3')).toBe(true);
    expect(whiteMoves.has('D3')).toBe(true);

    // Black piece moving forward (down — increasing y)
    const blackPos = Position.fromString('C6');
    const blackBoard = Board.fromPieces(
      pieces(['C6', PieceColor.BLACK, PieceType.PION]),
    );
    const blackAnalyzer = new Explorer(blackBoard);

    const blackOptions = blackAnalyzer.findValidMoves(blackPos);
    expect(blackOptions.hasCaptured()).toBe(false);

    const blackMoves = collectPositions(blackOptions);
    expect(blackMoves.has('B7')).toBe(true);
    expect(blackMoves.has('D7')).toBe(true);
  });

  // ── 17. "Capture near board edge" ──
  test('Capture near board edge', () => {
    const edgeCapturePos = Position.fromString('C6');
    const board = Board.fromPieces(
      pieces(
        ['C6', PieceColor.BLACK, PieceType.PION],
        ['B7', PieceColor.WHITE, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const edgeOptions = analyzer.findValidMoves(edgeCapturePos);
    expect(edgeOptions.empty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Pion Advanced capture scenarios") — 3 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Pion Advanced capture scenarios', () => {
  // ── 18. "Capture blocked by friendly piece" ──
  test('Capture blocked by friendly piece', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.WHITE, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(false);
  });

  // ── 19. "Capture landing blocked" ──
  test('Capture landing blocked', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
        ['A2', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(false);
  });

  // ── 20. "Capture with no landing space" ──
  test('Capture with no landing space', () => {
    const edgeFocus = Position.fromString('A4');
    const board = Board.fromPieces(
      pieces(
        ['A4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const edgeOptions = analyzer.findValidMoves(edgeFocus);
    // A4 white pion can capture B3 and land at C2 (valid on-board landing)
    if (edgeOptions.hasCaptured()) {
      expect(edgeOptions.empty()).toBe(false);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Legals get_positions() with capture sequences") — 2 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Legals get_positions() with capture sequences', () => {
  // ── 21. "get_positions() returns capture sequences - Pion" ──
  test('get_positions() returns capture sequences - Pion', () => {
    const focus = Position.fromString('C4');
    const board = Board.fromPieces(
      pieces(
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.size()).toBe(1);

    const targetPosition = options.getPosition(0);
    const capturedPieces = options.getCapturePieces(0);
    expect(capturedPieces.length).toBe(1);
    expect(capturedPieces[0].equals(Position.fromString('B3'))).toBe(true);
    expect(targetPosition.equals(Position.fromString('A2'))).toBe(true);
  });

  // ── 22. "get_positions() returns capture sequences - Dame" ──
  test('get_positions() returns capture sequences - Dame', () => {
    const focus = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        ['C4', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const options = analyzer.findValidMoves(focus);
    expect(options.hasCaptured()).toBe(true);
    expect(options.empty()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameCaptureAnalyzer - Basic functionality") — 3 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameCaptureAnalyzer - Basic functionality', () => {
  // ── 23. "Single capture scenario" ──
  test('Single capture scenario', () => {
    const damePos = Position.fromString('D3');
    const opponentPos = Position.fromString('E4');
    const landingPos = Position.fromString('F5');

    const board = Board.fromPieces(
      pieces(
        ['D3', PieceColor.WHITE, PieceType.DAME],
        ['E4', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.size()).toBe(1);

    const targetPosition = moves.getPosition(0);
    const capturedPieces = moves.getCapturePieces(0);
    expect(capturedPieces.length).toBe(1);
    expect(capturedPieces[0].equals(opponentPos)).toBe(true);
    expect(targetPosition.equals(landingPos)).toBe(true);
  });

  // ── 24. "No capture available" ──
  test('No capture available', () => {
    const damePos = Position.fromString('D3');
    const board = Board.fromPieces(
      pieces(['D3', PieceColor.WHITE, PieceType.DAME]),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.hasCaptured()).toBe(false);
  });

  // ── 25. "Blocked capture (no landing space)" ──
  test('Blocked capture (no landing space)', () => {
    const damePos = Position.fromString('D3');
    const board = Board.fromPieces(
      pieces(
        ['D3', PieceColor.WHITE, PieceType.DAME],
        ['E4', PieceColor.BLACK, PieceType.PION],
        ['F5', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.hasCaptured()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameAnalyzer - Multiple direction captures") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameAnalyzer - Multiple direction captures', () => {
  // ── 26. "Four direction captures" ──
  test('Four direction captures', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        // Opponent pieces in four directions
        ['C4', PieceColor.BLACK, PieceType.PION], // NW
        ['E4', PieceColor.BLACK, PieceType.PION], // NE
        ['C6', PieceColor.BLACK, PieceType.PION], // SW
        ['E6', PieceColor.BLACK, PieceType.PION], // SE
        // Block further captures by placing pieces at landing positions
        ['A2', PieceColor.BLACK, PieceType.PION], // Block B3
        ['G2', PieceColor.BLACK, PieceType.PION], // Block F3
        ['A8', PieceColor.BLACK, PieceType.PION], // Block B7
        ['G8', PieceColor.BLACK, PieceType.PION], // Block F7
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.size()).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameAnalyzer - Chain captures") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameAnalyzer - Chain captures', () => {
  // ── 27. "Simple chain capture" ──
  test('Simple chain capture', () => {
    const damePos = Position.fromString('B1');
    const board = Board.fromPieces(
      pieces(
        ['B1', PieceColor.WHITE, PieceType.DAME],
        ['C2', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.empty()).toBe(false);

    let foundSingleCapture = false;
    for (let i = 0; i < moves.size(); i++) {
      const targetPosition = moves.getPosition(i);
      const capturedPieces = moves.getCapturePieces(i);

      if (capturedPieces.length === 1) {
        if (
          capturedPieces[0].equals(Position.fromString('C2')) &&
          targetPosition.equals(Position.fromString('D3'))
        ) {
          foundSingleCapture = true;
        }
      }
    }
    expect(foundSingleCapture).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameAnalyzer - Deduplication") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameAnalyzer - Deduplication', () => {
  // ── 28. "Equivalent sequences should be deduplicated" ──
  test('Equivalent sequences should be deduplicated', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        ['C4', PieceColor.BLACK, PieceType.PION],
        ['E6', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);

    // Verify that we don't have duplicate equivalent sequences
    const uniqueOutcomes = new Set();

    for (let i = 0; i < moves.size(); i++) {
      const targetPosition = moves.getPosition(i);
      const capturedPieces = moves.getCapturePieces(i);

      const capturedHashes = capturedPieces
        .map((c) => c.hash())
        .sort((a, b) => a - b)
        .join(',');
      const key = `${capturedHashes}|${targetPosition.hash()}`;
      expect(uniqueOutcomes.has(key)).toBe(false);
      uniqueOutcomes.add(key);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameAnalyzer - Edge Cases and Comprehensive Coverage") — 6 sections
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameAnalyzer - Edge Cases and Comprehensive Coverage', () => {
  // ── 29. "Invalid position coordinates" ──
  test('Invalid position coordinates', () => {
    expect(() => Position.fromCoords(9, 9)).toThrow();
    expect(() => Position.fromCoords(-1, -1)).toThrow();
  });

  // ── 30. "Dame at board boundaries" ──
  test('Dame at board boundaries', () => {
    const edgePositions = [
      Position.fromString('B1'),
      Position.fromString('H1'),
      Position.fromString('A8'),
      Position.fromString('G8'),
    ];

    for (const edgePos of edgePositions) {
      const board = Board.fromPieces(
        pieces([edgePos.toString(), PieceColor.WHITE, PieceType.DAME]),
      );
      const dca = new Explorer(board);

      // Should not throw, just return available moves
      expect(() => dca.findValidMoves(edgePos)).not.toThrow();
    }
  });

  // ── 31. "Dame with only friendly pieces around" ──
  test('Dame with only friendly pieces around', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['E4', PieceColor.WHITE, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.hasCaptured()).toBe(false);
    expect(moves.empty()).toBe(false); // Should have moves in SW/SE directions
  });

  // ── 32. "Long range captures and moves" ──
  test('Long range captures and moves', () => {
    const damePos = Position.fromString('B1');
    const board = Board.fromPieces(
      pieces(
        ['B1', PieceColor.WHITE, PieceType.DAME],
        ['F5', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.size()).toBe(1);

    const targetPosition = moves.getPosition(0);
    const capturedPieces = moves.getCapturePieces(0);
    expect(capturedPieces.length).toBe(1);
    expect(capturedPieces[0].equals(Position.fromString('F5'))).toBe(true);
    expect(targetPosition.equals(Position.fromString('G6'))).toBe(true);
  });

  // ── 33. "Multiple opponents but no captures possible" ──
  test('Multiple opponents but no captures possible', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        ['C4', PieceColor.BLACK, PieceType.PION],
        ['B3', PieceColor.BLACK, PieceType.PION], // Block landing
        ['E6', PieceColor.BLACK, PieceType.PION],
        ['F7', PieceColor.BLACK, PieceType.PION], // Block landing
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.hasCaptured()).toBe(false);
  });

  // ── 34. "Regular moves - all directions" ──
  test('Regular moves - all directions', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(['D5', PieceColor.WHITE, PieceType.DAME]),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.size()).toBeGreaterThan(10);

    let hasNw = false;
    let hasNe = false;
    let hasSw = false;
    let hasSe = false;

    for (let i = 0; i < moves.size(); i++) {
      const pos = moves.getPosition(i);
      if (pos.x < damePos.x && pos.y < damePos.y) hasNw = true;
      if (pos.x > damePos.x && pos.y < damePos.y) hasNe = true;
      if (pos.x < damePos.x && pos.y > damePos.y) hasSw = true;
      if (pos.x > damePos.x && pos.y > damePos.y) hasSe = true;
    }

    expect(hasNw).toBe(true);
    expect(hasNe).toBe(true);
    expect(hasSw).toBe(true);
    expect(hasSe).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameAnalyzer - Deduplication Edge Cases") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameAnalyzer - Deduplication Edge Cases', () => {
  // ── 35. "Odd length sequence handling" ──
  test('Odd length sequence handling', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        ['C4', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);

    for (let i = 0; i < moves.size(); i++) {
      const capturedPieces = moves.getCapturePieces(i);
      expect(capturedPieces.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("DameAnalyzer - Black Dame Pieces") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('DameAnalyzer - Black Dame Pieces', () => {
  // ── 36. "Black dame capturing white pieces" ──
  test('Black dame capturing white pieces', () => {
    const damePos = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.BLACK, PieceType.DAME],
        ['C4', PieceColor.WHITE, PieceType.PION],
        ['E6', PieceColor.WHITE, PieceType.PION],
      ),
    );
    const dca = new Explorer(board);

    const moves = dca.findValidMoves(damePos);
    expect(moves.size()).toBeGreaterThanOrEqual(2);

    let foundC4Capture = false;
    let foundE6Capture = false;
    for (let i = 0; i < moves.size(); i++) {
      const capturedPieces = moves.getCapturePieces(i);
      if (capturedPieces.length > 0) {
        if (capturedPieces[0].equals(Position.fromString('C4'))) foundC4Capture = true;
        if (capturedPieces[0].equals(Position.fromString('E6'))) foundE6Capture = true;
      }
    }
    expect(foundC4Capture).toBe(true);
    expect(foundE6Capture).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST_CASE("Explorer - Dame complex capture sequences") — 1 section
// ═══════════════════════════════════════════════════════════════════════════════
describe('Explorer - Dame complex capture sequences', () => {
  // ── 37. "Complex capture pattern with distinct paths" ──
  test('Complex capture pattern with distinct paths', () => {
    const focus = Position.fromString('D5');
    const board = Board.fromPieces(
      pieces(
        ['D5', PieceColor.WHITE, PieceType.DAME],
        ['C2', PieceColor.BLACK, PieceType.PION],
        ['C4', PieceColor.BLACK, PieceType.PION],
        ['C6', PieceColor.BLACK, PieceType.PION],
        ['E2', PieceColor.BLACK, PieceType.PION],
        ['E4', PieceColor.BLACK, PieceType.PION],
        ['E6', PieceColor.BLACK, PieceType.PION],
        ['G2', PieceColor.BLACK, PieceType.PION],
        ['G4', PieceColor.BLACK, PieceType.PION],
        ['G6', PieceColor.BLACK, PieceType.PION],
      ),
    );
    const analyzer = new Explorer(board);

    const moves = analyzer.findValidMoves(focus);
    expect(moves.hasCaptured()).toBe(true);

    // The explorer deduplicates sequences by full path.
    const sequenceCount = moves.size();
    expect(sequenceCount).toBe(51);

    // Verify path length distribution
    const pathLengthCounts = new Map();
    for (let i = 0; i < sequenceCount; i++) {
      const capturedPieces = moves.getCapturePieces(i);
      const len = capturedPieces.length;
      pathLengthCounts.set(len, (pathLengthCounts.get(len) ?? 0) + 1);
    }

    expect(pathLengthCounts.get(3)).toBe(3);  // 3 sequences with 3 captures
    expect(pathLengthCounts.get(6)).toBe(14); // 14 sequences with 6 captures
    expect(pathLengthCounts.get(7)).toBe(14); // 14 sequences with 7 captures
    expect(pathLengthCounts.get(8)).toBe(2);  // 2 sequences with 8 captures
    expect(pathLengthCounts.get(9)).toBe(18); // 18 sequences with 9 captures
  });
});
