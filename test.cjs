const fs = require('fs');
let content = fs.readFileSync('src/components/PaymentManagementModal.tsx', 'utf-8');

content = content.replace(
  'const handleScreenshotUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {',
  `const handleScreenshotUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          updatePhase(id, { screenshotUrl: dataUrl });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const oldHandleScreenshotUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {`
);

content = content.replace(
  `  const oldHandleScreenshotUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updatePhase(id, { screenshotUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };`,
  ``
);

fs.writeFileSync('src/components/PaymentManagementModal.tsx', content);
