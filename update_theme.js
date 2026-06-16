const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "admin-panel.css");
let css = fs.readFileSync(cssPath, "utf8");

// 1. Root variables
css = css.replace(
  /:root\s*\{[^}]+\}/,
  `:root {
  --black: #050505;
  --bg: #121212;
  --bg2: #1e1e24;
  --gray: #1a1a1f;
  --gray2: #24242a;
  --gray3: rgba(255, 255, 255, 0.1);
  --border: rgba(229, 228, 226, 0.15);
  --white: #e5e4e2;
  --accent: #d1cfcb;
  --accent2: rgba(209, 207, 203, 0.18);
  --red: #ff4d4d;
  --green: #03bb4f;
  --orange: #f39c12;
  --blue: #3498db;
  --gray-text: #a0a0a5;
  --radius: 8px;
  --trans: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}`,
);

// 2. Body gradient
css = css.replace(
  /body\s*\{\s*background:\s*linear-gradient\([^)]+\);/g,
  "body {\n  background: linear-gradient(160deg, #121212 0%, #1a1a1f 45%, #050505 100%);",
);

// 3. Login screen gradient
css = css.replace(
  /background:\s*linear-gradient\([\s\S]*?100%\s*\);/g,
  (match) => {
    if (match.includes("login-screen") || match.includes("135deg")) {
      return `background: linear-gradient(
    135deg,
    rgba(209, 207, 203, 0.05) 0%,
    rgba(229, 228, 226, 0.06) 55%,
    rgba(0, 0, 0, 0.72) 100%
  );`;
    }
    return match;
  },
);

// App gradient
css = css.replace(
  /\.app\s*\{\s*[\s\S]*?background:\s*linear-gradient\([^)]+\);/,
  (match) => {
    return match.replace(
      /background:\s*linear-gradient\([^)]+\);/,
      "background: linear-gradient(135deg, #121212 0%, #1a1a1f 40%, #050505 100%);",
    );
  },
);

// Sidebar gradient
css = css.replace(
  /\.sidebar\s*\{\s*[\s\S]*?background:\s*linear-gradient\([^)]+\);/,
  (match) => {
    return match.replace(
      /background:\s*linear-gradient\([^)]+\);/,
      "background: linear-gradient(180deg, #1a1a1f 0%, #121212 100%);",
    );
  },
);

// Topbar gradient
css = css.replace(
  /\.topbar\s*\{\s*[\s\S]*?background:\s*linear-gradient\([^)]+\);/,
  (match) => {
    return match.replace(
      /background:\s*linear-gradient\([^)]+\);/,
      "background: linear-gradient(90deg, #1a1a1f 0%, #121212 70%, #050505 100%);",
    );
  },
);

// Sidebar logo background
css = css.replace(
  /\.sidebar-logo\s*\{\s*[\s\S]*?background:\s*rgba\([^)]+\);/,
  (match) => {
    return match.replace(
      /background:\s*rgba\([^)]+\);/,
      "background: rgba(26, 26, 31, 0.72);",
    );
  },
);

// Modals background
css = css.replace(
  /\.modal\s*\{\s*[\s\S]*?background:\s*#[a-fA-F0-9]+;/,
  (match) => {
    return match.replace(
      /background:\s*#[a-fA-F0-9]+;/,
      "background: #1a1a1f;",
    );
  },
);
css = css.replace(
  /\.modal-header\s*\{\s*[\s\S]*?background:\s*#[a-fA-F0-9]+;/,
  (match) => {
    return match.replace(
      /background:\s*#[a-fA-F0-9]+;/,
      "background: #24242a;",
    );
  },
);
css = css.replace(
  /\.modal-body\s*\{\s*[\s\S]*?background:\s*#[a-fA-F0-9]+;/,
  (match) => {
    return match.replace(
      /background:\s*#[a-fA-F0-9]+;/,
      "background: #1a1a1f;",
    );
  },
);
css = css.replace(
  /\.modal-footer\s*\{\s*[\s\S]*?background:\s*#[a-fA-F0-9]+;/,
  (match) => {
    return match.replace(
      /background:\s*#[a-fA-F0-9]+;/,
      "background: #24242a;",
    );
  },
);

// Replace all remaining light hardcoded colors and yellow-green highlights
// RGBA highlights
css = css.replace(/rgba\(232,\s*255,\s*71/g, "rgba(209, 207, 203");
css = css.replace(/rgba\(200,\s*232,\s*15/g, "rgba(209, 207, 203");
css = css.replace(/rgba\(139,\s*220,\s*28/g, "rgba(209, 207, 203");

// Gradients using yellow-greens
css = css.replace(
  /linear-gradient\([^)]+e8ff47[^)]+\)/g,
  "linear-gradient(120deg, #e5e4e2 0%, #d1cfcb 60%, #b8b6b2 100%)",
);
css = css.replace(
  /linear-gradient\([^)]+d6ff5f[^)]+\)/g,
  "linear-gradient(120deg, #e5e4e2 0%, #d1cfcb 60%, #b8b6b2 100%)",
);
css = css.replace(
  /linear-gradient\([^)]+e8ff8a[^)]+\)/g,
  "linear-gradient(120deg, #ffffff 0%, #e5e4e2 60%, #d1cfcb 100%)",
);

// Other colors
css = css.replace(/#e8ff47/g, "#d1cfcb");
css = css.replace(/#c8e80f/g, "#d1cfcb");
css = css.replace(/#0c1200/g, "#050505");
css = css.replace(/#0a1200/g, "#050505");
css = css.replace(/#041400/g, "#050505");

// Update any transparent borders
css = css.replace(
  /border:\s*1px\s+solid\s+rgba\(0,\s*0,\s*0,\s*0\.0[0-9]+\);/g,
  "border: 1px solid var(--border);",
);
css = css.replace(
  /border-bottom:\s*1px\s+solid\s+rgba\(0,\s*0,\s*0,\s*0\.0[0-9]+\);/g,
  "border-bottom: 1px solid var(--border);",
);
css = css.replace(
  /border-top:\s*1px\s+solid\s+rgba\(0,\s*0,\s*0,\s*0\.0[0-9]+\);/g,
  "border-top: 1px solid var(--border);",
);

// Change card gradients (e.g. dash-card, kpi-card)
css = css.replace(
  /rgba\(255,\s*255,\s*255,\s*0\.0[0-9]+\)/g,
  "rgba(255, 255, 255, 0.05)",
);

fs.writeFileSync(cssPath, css, "utf8");
console.log("CSS updated successfully.");
