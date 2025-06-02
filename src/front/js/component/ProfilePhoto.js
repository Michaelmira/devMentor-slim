import React, { useState, useContext, useEffect, useRef } from "react";
import { Context } from "../store/appContext";
import userIcon from "../../img/user-3296.png";
import { compressImage } from "../services/mentorProfileServices";


const ProfilePhoto = ({
  url,
  setMentor,
  editMode,
  uploadedImages,
  setUploadedImages,
  previewImg,
  setPreviewImg,
  isMarkedForDeletion,
  setIsMarkedForDeletion,
  position,
  setPosition,
  scale,
  setScale,
  positionX,
  positionY,
  imageScale,
  imageSizeError,
  setImageSizeError,
}) => {

  const { store, actions } = useContext(Context);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: positionX, y: positionY });
  // const defaultUserIcon = "https://res.cloudinary.com/dufs8hbca/image/upload/v1730340260/Saved/PlaceholderImg_augxly.png";
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 2;
  const SCALE_STEP = 0.1;

  useEffect(() => {
    if (editMode && uploadedImages.length > 0) {
      setMentor((prev) => ({
        ...prev,
        // profile_photo_transform: { position, scale }
      }));
    }
  }, [position, scale, editMode, uploadedImages.length]);

  useEffect(() => {
    setScale(imageScale);
    setPosition({ x: positionX, y: positionY });
    console.log("POSITION/SCALE", position, scale);
  }, [editMode, positionX, positionY, imageScale]);

  // Reset image position and scale when mounting or changing modes
  useEffect(() => {
    if (!editMode) {
      setIsMarkedForDeletion(false);
      // setPosition({ x: 0, y: 0 });
      // setScale(1);
    }
  }, [editMode]);

  // Reset image position and scale when uploading new image
  useEffect(() => {
    if (uploadedImages.length > 0) {
      setIsMarkedForDeletion(false);
      // setScale(1);
      // setPosition({ x: 0, y: 0 });
    }
  }, [uploadedImages]);


  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;

    // console.log("EVENT target", event.target);

    // let compressedImg;
    let fileToUse = files[0];

    // console.log("FILES", files[0].size);

    const file_size = files[0].size;
    if (file_size > 100000) {
      // setImageSizeError(true);
      // return;
      const compressedImg = await compressImage(files[0]);
      if (compressedImg) {
        fileToUse = compressedImg;
      }
    }

    console.log("compressed IMG:", fileToUse);
    const newFileSize = fileToUse.size;
    console.log(newFileSize);

    if (newFileSize > 100000) {
      setImageSizeError(true);
      return;
    }

    setImageSizeError(false);
    const imageUrl = URL.createObjectURL(fileToUse);
    const img = new Image();
    img.onload = () => {
      const containerSize = 300;
      const scale = Math.max(
        (containerSize / img.width) * 1.5,
        (containerSize / img.height) * 1.5
      );

      setScale(scale);
      setPosition({ x: 0, y: 0 });
    };

    img.src = imageUrl;
    setPreviewImg(imageUrl);
    setUploadedImages((prev) => [...prev, fileToUse]);
  };

  const handleMouseDown = (e) => {
    if (!editMode) return;
    setIsDragging(true);

    // const rect = imageRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });

    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !editMode) return;

    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image) return;

    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;

    // Calculate boundaries based on scaled dimensions
    const scaledWidth = image.offsetWidth * scale;
    const scaledHeight = image.offsetHeight * scale;

    const maxX = Math.max(0, (scaledWidth - container.offsetWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - container.offsetHeight) / 2);

    setPosition({
      x: Math.max(Math.min(newX, maxX), -maxX),
      y: Math.max(Math.min(newY, maxY), -maxY),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleImageDeletion = () => {
    setIsMarkedForDeletion((prev) => !prev);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE));
  };

  return (
    <div className="column profile-photo">
      <div ref={containerRef} className="profile-photo-container">
        {editMode && (
          <button
            type="button"
            onClick={toggleImageDeletion}
            className={`profile-photo-delete-button ${
              isMarkedForDeletion ? "undo" : ""
            }`}
          >
            {isMarkedForDeletion ? "↺" : "×"}
          </button>
        )}
        <div
          className="image-wrapper"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={isMarkedForDeletion ? userIcon : previewImg || url}
            alt="Profile Picture"
            className={`profile-image ${editMode ? "editable" : ""} ${
              isDragging ? "dragging" : ""
            }`}
            style={{
              transform: `translate(calc(-50% + ${
                editMode ? position.x : positionX
              }px), calc(-50% + ${
                editMode ? position.y : positionY
              }px)) scale(${editMode ? scale : imageScale})`,
            }}
            onMouseDown={handleMouseDown}
            draggable={false}
          />
        </div>
        {editMode && (
          <div className="zoom-controls">
            <button
              onClick={handleZoomOut}
              className="zoom-button"
              type="button"
            >
              −
            </button>
            <span className="zoom-separator">|</span>
            <button
              onClick={handleZoomIn}
              className="zoom-button"
              type="button"
            >
              +
            </button>
          </div>
        )}
      </div>
      {editMode && (
        <div className="row my-3">
          <input
            type="file"
            id="profile-picture"
            className="form-control"
            onChange={handleImageUpload}
            accept="image/*"
          />
          {imageSizeError && (
            <label className="text-danger">
              Error: The size of the image must be below 100kb
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePhoto;
