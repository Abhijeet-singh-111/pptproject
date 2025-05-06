function generatePPT() {
    // Assuming pptxgenjs library is loaded via the provided CDN link:
// Initialize PowerPoint
const pptx = new PptxGenJS();
// Define a custom layout if needed, or use default 'LAYOUT_WIDE' etc.
// pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 7.5 });

const PX_PER_INCH = 96;

function pxToInches(pxValue) {
    return parseFloat(pxValue) / PX_PER_INCH;
}

function extractTranslateInches(element) {
    const style = window.getComputedStyle(element);
    const transform = style.transform;

    if (transform && transform.includes('translate')) {
        const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (match) {
            const xInches = pxToInches(match[1]);
            const yInches = pxToInches(match[2]);
            return { xInches, yInches };
        }
    }

    return { xInches: 0, yInches: 0 }; // default if no translate found
}

// Helper function to convert color values to hex (handles names, rgb, hex)
function toPptxColor(color) {
  if (!color || typeof color !== 'string') return null;
  color = color.toLowerCase().trim();

  const colorMap = {
      'red': 'FF0000',
      'blue': '0000FF',
      'green': '00FF00',
      'black': '000000',
      'white': 'FFFFFF'
      // Add more color names as needed
  };

  if (color in colorMap) return colorMap[color];

  // Handle hex colors (#RGB or #RRGGBB)
  if (color.startsWith('#')) {
      color = color.slice(1);
      if (color.length === 3) {
          return color.split('').map(char => char + char).join('').toUpperCase();
      }
      if (color.length === 6) {
          return color.toUpperCase();
      }
  }

  // Handle rgb() colors
  if (color.startsWith('rgb(')) {
      const rgbMatch = color.match(/\d+/g);
      if (rgbMatch && rgbMatch.length === 3) {
          const rgb = rgbMatch.map(Number);
          return rgb.map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
      }
  }

  return null; // Return null for unrecognized colors
}

// Helper function to convert pixel values to points (pptxgenjs uses points for font size)
function pxToPt(px) {
  // Ensure px is a valid number
  px = parseFloat(px);
  if (isNaN(px)) return null; // Return null or a default if conversion fails
  return px * 0.75; // Standard conversion rate
}

// Function to process HTML elements and build an array of text run objects for pptxgenjs
function buildTextRuns(element) {
  let runs = [];

  // Stop processing if the element is null, undefined, or a comment
  if (!element || element.nodeType === Node.COMMENT_NODE) {
      return runs;
  }

  // Handle Text Nodes
  if (element.nodeType === Node.TEXT_NODE) {
      // Replace non-breaking spaces and trim whitespace
      const text = element.textContent.replace(/&nbsp;/g, ' ').trim();
      if (text) {
          // Inherit styles from the parent element (use getComputedStyle for accuracy)
          let parentStyles = {};
          if (element.parentElement) {
              const parentComputedStyle = window.getComputedStyle(element.parentElement);
              parentStyles.fontSize = pxToPt(parentComputedStyle.fontSize);
              parentStyles.color = toPptxColor(parentComputedStyle.color);
              // Check for bold weight (common values are 'bold', 'bolder', 700, 600)
              parentStyles.bold = parentComputedStyle.fontWeight === 'bold' || parentComputedStyle.fontWeight === 'bolder' || parseInt(parentComputedStyle.fontWeight) >= 600;
          }

          runs.push({
              text: text,
              options: { ...parentStyles } // Apply inherited styles to the text run
          });
      }
      return runs; // Stop processing children for text nodes
  }

  // If it's not an Element Node, skip direct processing but process children
  if (element.nodeType !== Node.ELEMENT_NODE) {
       Array.from(element.childNodes).forEach(child => {
           runs = runs.concat(buildTextRuns(child)); // Recursively process children
       });
       return runs; // Return after processing children
  }

  // Now we are sure it's an ELEMENT_NODE, safe to access style and tagName
  const tagName = element.tagName.toLowerCase();
  const elementStyle = element.style; // Access inline styles

  // Ignore elements with display: none inline style
  if (elementStyle.display === 'none') {
      return runs;
  }

  // Determine styles for the current element, inheriting and overriding
  let currentStyles = {};
  // Start with inherited styles from parent (computed style)
   if (element.parentElement) {
       const parentComputedStyle = window.getComputedStyle(element.parentElement);
       currentStyles.fontSize = pxToPt(parentComputedStyle.fontSize);
       currentStyles.color = toPptxColor(parentComputedStyle.color);
       currentStyles.bold = parentComputedStyle.fontWeight === 'bold' || parentComputedStyle.fontWeight === 'bolder' || parseInt(parentComputedStyle.fontWeight) >= 600;
   }

  // Apply current element's inline styles (these override inherited styles)
  if (elementStyle.fontSize) currentStyles.fontSize = pxToPt(elementStyle.fontSize);
  // Check if color is set with !important in HTML, as getComputedStyle handles it.
  // However, inline style overrides computed style for the same property.
  // Let's prioritize inline style if present.
  if (elementStyle.color) {
      currentStyles.color = toPptxColor(elementStyle.color);
  } else if (element.parentElement) {
       // If no inline color, use the inherited computed color
       currentStyles.color = toPptxColor(window.getComputedStyle(element.parentElement).color);
  }


  if (elementStyle.fontWeight) {
      currentStyles.bold = elementStyle.fontWeight === 'bold' || parseInt(elementStyle.fontWeight) >= 600;
  } else if (element.parentElement) {
      // If no inline font-weight, use the inherited computed font-weight
       currentStyles.bold = window.getComputedStyle(element.parentElement).fontWeight === 'bold' || parseInt(window.getComputedStyle(element.parentElement).fontWeight) >= 600;
  }


  // Handle specific tags that affect text runs
  if (tagName === 'sup') {
      // Handle superscript text
      const supText = element.textContent.trim();
      if (supText) {
          runs.push({
              text: supText,
              options: {
                  ...currentStyles, // Inherit styles up to the sup element
                  superscript: true,
                  // Optionally reduce font size for superscript relative to the current size
                  fontSize: currentStyles.fontSize ? currentStyles.fontSize * 0.7 : 10 // Reduce or use a default
              }
          });
      }
      // Do not process children of sup as its content is handled
      return runs;
  }

  if (tagName === 'br') {
      // Add a newline character for <br> tags
      runs.push({ text: '\n', options: {} });
      // <br> tags do not have children to process in this context
      return runs;
  }

  // For other standard elements (div, span, p, etc.), recursively process their children.
  // Styles applied to the current element will be inherited by its children
  // and applied to text runs generated within those children unless overridden.
  Array.from(element.childNodes).forEach(child => {
      runs = runs.concat(buildTextRuns(child)); // Merge runs from children
  });


  return runs; // Return the collected runs
}

// Find all elements with the class "QuestionArea"
const questionAreas = document.querySelectorAll('.QuestionArea');

// Process each QuestionArea as a separate slide
questionAreas.forEach((questionArea, index) => {
  const slide = pptx.addSlide();

  // Process the main question text block within QuestionArea
  // Find the div with the specific styles for the question
  const questionDiv = questionArea.querySelector('div[style*="color: red"][style*="font-size:30px"]');
  if (questionDiv) {
      // Find the element containing the actual text content (e.g., the .alterable.parent or the questionDiv itself)
      const questionContentElement = questionDiv.querySelector('.alterable.parent') || questionDiv;

      if (questionContentElement) {
          // Build the array of text run objects for the question
          const questionTextRuns = buildTextRuns(questionContentElement);
          let { xInches, yInches } = extractTranslateInches(questionContentElement);
          // Add the question text as a single text box to the slide
          // Estimate the position and size on the slide. The transform(0,0) means no translation offset needed from its natural layout position.
          slide.addText(questionTextRuns, {
              x: xInches, // Estimated starting x position in inches from the left edge
              y: yInches, // Estimated starting y position in inches from the top edge
              w: 9.0, // Estimated width of the text box in inches
              h: 1.0, // Estimated height of the text box in inches (adjust based on content wrapping)
              valign: 'top' // Align text to the top of the text box
          });
      }
  }

  // Process the options block within QuestionArea
  // Find the main container div for the options
  const optionsDiv = questionArea.querySelector('div[style*="width:90%"][style*="font-size:30px"]:not([style*="display:inline-flex"])'); // Exclude the inline-flex divs themselves as they are processed individually

  if (optionsDiv) {
      // Find the individual option line containers (the divs with display:inline-flex immediately within optionsDiv)
      // We use :scope to ensure we only get direct children with these styles within optionsDiv
      const optionElements = optionsDiv.querySelectorAll(':scope > div[style*="display:inline-flex"]');

      let currentOptionY = 1.8; // Starting y position for the first option line, below the question

      optionElements.forEach((optionElement, i) => {
          // Build text runs for the content of the current option line (e.g., "(a) x² + ...")
          const optionTextRuns = buildTextRuns(optionElement);
          let { xInches, yInches } = extractTranslateInches(optionElement);
          // Add the combined text for the option line as a single text box
          // Each option line from the HTML is treated as a separate text box in the PPTX,
          // positioned vertically based on its order.
          slide.addText(optionTextRuns, {
              x: xInches, // Estimated starting x position for options (slightly indented)
              y: yInches,
              w: 8.5, // Estimated width for the option text box
              h: 0.4, // Estimated height per option line (adjust if options are very long)
              valign: 'top'
          });

          // Increment the y position for the next option line.
          // The <br> tags in the HTML structure implicitly create new lines.
          currentOptionY += 0.4; // Add estimated line height for spacing
      });
  }
});

// To generate and download the PPTX file in a browser environment, you would call:

pptx.writeFile({ fileName: "QuestionSlides_Final.pptx" }).then(fileName => {
console.log(`Created file: ${fileName}`);
});


// This code needs to be executed in a browser environment where the DOM is loaded and pptxgenjs is available.
  }