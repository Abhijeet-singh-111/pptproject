async function generateEmptyImageBasedPPT() {
  const pptx = new PptxGenJS();
  const questionAreas = document.querySelectorAll('.QuestionArea');

  for (const qa of questionAreas) {
    const clone = qa.cloneNode(true);

    // Ensure it's visible but off-screen
    Object.assign(clone.style, {
      position: 'absolute',
      top: '0px',
      left: '-9999px',
      zIndex: '-1',
      display: 'block',
      backgroundColor: 'white',  // ✅ avoid black background
      width: qa.offsetWidth + 'px',
      height: qa.offsetHeight + 'px'
    });

    document.body.appendChild(clone);

    // Wait a moment for layout/rendering to apply
    await new Promise(r => setTimeout(r, 100));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: 'white'  // ✅ avoid black background
    });

    const imgData = canvas.toDataURL('image/png');
    const slide = pptx.addSlide();
    slide.addImage({ data: imgData, x: 0, y: 0, w: '65%', h: '100%' });

    document.body.removeChild(clone);
  }

  pptx.writeFile('questions.pptx');
}