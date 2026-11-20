/* tools/build_sprites.py 가 만든 파일 — 직접 고치지 마세요 */
(function (root) {
  const DN = (root.DN = root.DN || {});
  DN.SPRITES = {
    "day": {
      "legs": {
        "l": {
          "pivot": [
            129,
            352
          ]
        },
        "r": {
          "pivot": [
            166,
            330
          ]
        }
      },
      "w": 245,
      "h": 533,
      "foot": [
        140,
        526
      ],
      "hand": [
        225,
        288
      ]
    },
    "night": {
      "legs": {
        "l": {
          "pivot": [
            111,
            371
          ]
        },
        "r": {
          "pivot": [
            142,
            339
          ]
        }
      },
      "w": 249,
      "h": 532,
      "foot": [
        128,
        525
      ],
      "hand": [
        219,
        287
      ]
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
