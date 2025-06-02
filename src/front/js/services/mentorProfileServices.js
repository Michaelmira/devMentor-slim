export const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
  
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
  
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
  
          // Calculate new dimensions while maintaining aspect ratio
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
  
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }
  
          canvas.width = width;
          canvas.height = height;
  
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
  
          canvas.toBlob(
            (blob) => {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            0.3
          ); // Adjust quality here (0.7 = 70% quality)
        };
      };
    });
  };
  
  
  export const processImages = async (files) => {
      // Convert FileList to Array if needed
      const filesArray = Array.from(files);
      
      try {
        // Process all files in parallel using Promise.all
        const compressedFiles = await Promise.all(
          filesArray.map(async (file) => {
            // Only compress if file size is over 100KB
            if (file.size > 100000) {
              return await compressImage(file);
            }
            // Return original file if no compression needed
            return file;
          })
        );
    
        return compressedFiles;
      } catch (error) {
        console.error('Error compressing images:', error);
        return filesArray; // Return original files if compression fails
      }
    };