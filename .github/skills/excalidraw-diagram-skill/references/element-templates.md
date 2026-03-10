# Element Templates

Copy-paste JSON templates for each Excalidraw element type. Colors below use the **dark mode palette** from `color-palette.md`. Replace semantic colors based on each element's purpose.

---

## Text Sizing Reference (CRITICAL)

**You MUST calculate container width from text content.** Excalidraw clips text that exceeds its width/height. Use these formulas:

| Font Size | Approx Width per Char | Line Height |
|-----------|----------------------|-------------|
| 28px | ~17px | ~35px |
| 20px | ~12px | ~25px |
| 18px | ~11px | ~23px |
| 16px | ~9.5px | ~20px |
| 14px | ~8.4px | ~18px |
| 13px | ~7.8px | ~17px |
| 12px | ~7.2px | ~15px |
| 11px | ~6.6px | ~14px |
| 10px | ~6px | ~13px |

**Container sizing rules:**
- **Free-floating text**: `width = charCount × charWidth + 20` (buffer for rendering variance)
- **Rectangle text**: Container width = text width + 40px padding (20px each side)
- **Ellipse text**: Container width = text width + 60px padding (ellipse clips more than rectangles)
- **Diamond text**: Container width = text width × 2.2 (diamond usable area is ~45% of bounding box)
- **Multi-line text**: `height = lineCount × lineHeight`

**Example**: "Analyst-Database" is 16 chars at fontSize 13 → `16 × 7.8 = 125px` text width → rectangle needs `125 + 40 = 165px` width minimum.

---

## Free-Floating Text (no container)
```json
{
  "type": "text",
  "id": "label1",
  "x": 100, "y": 100,
  "width": 200, "height": 25,
  "text": "Section Title",
  "originalText": "Section Title",
  "fontSize": 20,
  "fontFamily": 3,
  "textAlign": "left",
  "verticalAlign": "top",
  "strokeColor": "#e2e8f0",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 11111,
  "version": 1,
  "versionNonce": 22222,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false,
  "containerId": null,
  "lineHeight": 1.25
}
```

## Line (structural, not arrow)
```json
{
  "type": "line",
  "id": "line1",
  "x": 100, "y": 100,
  "width": 0, "height": 200,
  "strokeColor": "#475569",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 44444,
  "version": 1,
  "versionNonce": 55555,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false,
  "points": [[0, 0], [0, 200]]
}
```

## Small Marker Dot
```json
{
  "type": "ellipse",
  "id": "dot1",
  "x": 94, "y": 94,
  "width": 12, "height": 12,
  "strokeColor": "#3b82f6",
  "backgroundColor": "#3b82f6",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 66666,
  "version": 1,
  "versionNonce": 77777,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false
}
```

## Rectangle (dark mode)
```json
{
  "type": "rectangle",
  "id": "elem1",
  "x": 100, "y": 100, "width": 180, "height": 50,
  "strokeColor": "#3b82f6",
  "backgroundColor": "#1e3a5f",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 12345,
  "version": 1,
  "versionNonce": 67890,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": [{"id": "text1", "type": "text"}],
  "link": null,
  "locked": false,
  "roundness": {"type": 3}
}
```

## Text (centered in shape, dark mode)
```json
{
  "type": "text",
  "id": "text1",
  "x": 120, "y": 112,
  "width": 140, "height": 25,
  "text": "Process",
  "originalText": "Process",
  "fontSize": 16,
  "fontFamily": 3,
  "textAlign": "center",
  "verticalAlign": "middle",
  "strokeColor": "#e2e8f0",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 11111,
  "version": 1,
  "versionNonce": 22222,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false,
  "containerId": "elem1",
  "lineHeight": 1.25
}
```

## Arrow (dark mode)
```json
{
  "type": "arrow",
  "id": "arrow1",
  "x": 282, "y": 125, "width": 118, "height": 0,
  "strokeColor": "#3b82f6",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 33333,
  "version": 1,
  "versionNonce": 44444,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false,
  "points": [[0, 0], [118, 0]],
  "startBinding": {"elementId": "elem1", "focus": 0, "gap": 2},
  "endBinding": {"elementId": "elem2", "focus": 0, "gap": 2},
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

For curves: use 3+ points in `points` array.

## Routed Arrow (4-point L-bend, fan-out pattern)

Use this for fan-out arrows that need to route around other elements. All arrows in a fan-out group share the same origin point and vertical trunk.

```json
{
  "type": "arrow",
  "id": "fanout_1",
  "x": 355, "y": 232, "width": 355, "height": 122,
  "strokeColor": "#3b82f6",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 55555,
  "version": 1,
  "versionNonce": 66666,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false,
  "points": [
    [0, 0],
    [-355, 0],
    [-355, 122],
    [-320, 122]
  ],
  "startBinding": {"elementId": "source_elem", "focus": 0, "gap": 0},
  "endBinding": {"elementId": "target_elem", "focus": 0, "gap": 0},
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

**Key pattern**: 4 points form an L-shape:
1. `[0, 0]` — start at source edge
2. `[-trunkX, 0]` — horizontal to trunk channel (left of all content)
3. `[-trunkX, targetY]` — vertical down trunk to target's row
4. `[-trunkX + 35, targetY]` — horizontal branch to target (35px clearance)

For multiple fan-out arrows, use the same x,y origin and trunkX, only change targetY per row (e.g., +60px spacing).

## Cycle Loop Arrow (4-point, routes around diagram)
```json
{
  "type": "arrow",
  "id": "cycle_loop",
  "x": 241, "y": 869, "width": 668, "height": 637,
  "strokeColor": "#ef4444",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "strokeStyle": "dashed",
  "roughness": 0,
  "opacity": 100,
  "angle": 0,
  "seed": 77777,
  "version": 1,
  "versionNonce": 88888,
  "isDeleted": false,
  "groupIds": [],
  "boundElements": null,
  "link": null,
  "locked": false,
  "points": [
    [0, 0],
    [668, 0],
    [668, -637],
    [304, -637]
  ],
  "startBinding": {"elementId": "end_node", "focus": 0, "gap": 0},
  "endBinding": {"elementId": "start_node", "focus": 0, "gap": 0},
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

**Pattern**: Right → Up → Left. Routes through clear space on the far right of the diagram.

## appState (dark mode default)
```json
{
  "appState": {
    "viewBackgroundColor": "#181926",
    "gridSize": 20
  }
}
```
