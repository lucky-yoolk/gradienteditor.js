# gradienteditor.js
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**GradientEditor.js** is a lightweight JavaScript plugin designed to provide an intuitive UI for creating and managing CSS gradients. It supports multiple gradient color stops, directional adjustments, and pre-defined gradient templates.

## Features

Manage Color stops, Direction, show/hide UI elements, target multiple elements to preview

##  Installation

### Using CDN

```html
<link href="https://cdn.jsdelivr.net/gh/lucky-yoolk/gradienteditor.js/gradient-editor.css">
<script src="https://cdn.jsdelivr.net/gh/lucky-yoolk/gradienteditor.js/gradient-editor.js"></script>
```

### Using NPM

```sh
npm install gradienteditor.js
```

Then import it in your JavaScript:

```js
import GradientEditor from "gradienteditor.js";
```

##  Usage

### Basic Initialization

```js
const gradientEditor = new GradientEditor("#gradient-input", {
  previewContainer: ".preview-box",
  previewContainer: ["#output-1", "#output-2"],
  showInput: false,
  showDirectionToggle: true,
  showDirectionDegrees: true,
  showTemplates: true
});
```

### Options

| Option                | Type            | Default Value                                      | Description |
|----------------------|----------------|--------------------------------------------------|-------------|
| `defaultDirection`   | `string`        | `"to right"`                                     | The default gradient direction. |
| `defaultColorStops`  | `Array<Object>` | `[{ color: "rgba(255, 0, 0, 1)", position: 0 }, { color: "rgba(0, 0, 255, 1)", position: 100 }]` | Initial color stops. |
| `defaultValue`       | `string`        | `null`                                           | Custom default gradient value. |
| `showInput`          | `boolean`       | `false`                                          | Whether to show the raw gradient input field. |
| `showDirectionToggle`| `boolean`       | `true`                                           | Toggle for preset directions. |
| `showDirectionDegrees` | `boolean`    | `true`                                           | Enable custom angle selection. |
| `showTemplates`      | `boolean`       | `true`                                           | Show pre-made gradient templates. |
| `previewContainer`   | `string/array`  | `null`                                           | Apply gradient to an element |      


### Example with Advanced Configuration
```js
const gradientEditor = new GradientEditor("#gradient-input", {
  defaultDirection: "to bottom right",
  defaultColorStops: [
    { color: "rgba(255, 165, 0, 1)", position: 0 },
    { color: "rgba(255, 0, 255, 1)", position: 100 },
  ],
  previewContainer: [".preview-box", "#background"],
  showInput: true,
  showDirectionToggle: true,
  showDirectionDegrees: true,
  showTemplates: true
});
```

##  API Methods

```updatePreview()```

Updates all preview elements with the current gradient.

```js
gradientEditor.updatePreview();
```

```applyDefaultGradient()``` Applies the default gradient settings.

```js
gradientEditor.applyDefaultGradient();
```

```updateGradientDirection(direction)``` Updates the gradient direction.

```js
gradientEditor.updateGradientDirection("to top left");
```

```addColorStop(color, position)``` Adds a new color stop.

```js
gradientEditor.addColorStop("rgba(0, 255, 0, 1)", 50);
```

```removeColorStop(index)``` Removes a color stop at a given index.

```js
gradientEditor.removeColorStop(1);
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
