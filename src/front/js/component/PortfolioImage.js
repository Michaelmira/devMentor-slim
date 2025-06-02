import React, { useState, useContext, useEffect } from "react";
import { Context } from "../store/appContext";
import { processImages } from "../services/mentorProfileServices";

const PortfolioImage = ({
  portfolioImgs,
  setMentor,
  editMode,
  uploadedPortfolioImages,
  setUploadedPortfolioImages,
  markedForDeletion,
  setMarkedForDeletion,
  portfolioImgSizeError,
  setPortfolioImgSizeError,
}) => {
  const { store, actions } = useContext(Context);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);

  useEffect(() => {
    // Initialize Bootstrap modal
    const modalElement = document.getElementById("portfolioModal");
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement, {
        keyboard: true,
        backdrop: true,
      });
    }
  }, []);

  useEffect(() => {
    if (!editMode) {
      setMarkedForDeletion([]);
    }
  }, [editMode]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      // if (e.key === 'ArrowLeft') {
      //   navigateImages('prev');
      // } else if (e.key === 'ArrowRight') {
      if (e.key === "ArrowLeft") {
        const leftButton = document.querySelector(".navigation-arrow.start-0");
        leftButton.classList.add("active");
        setTimeout(() => leftButton.classList.remove("active"), 200);
        navigateImages("prev");
      } else if (e.key === "ArrowRight") {
        const rightButton = document.querySelector(".navigation-arrow.end-0");
        rightButton.classList.add("active");
        setTimeout(() => rightButton.classList.remove("active"), 200);
        navigateImages("next");
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [currentModalIndex]);

  const toggleImageDeletion = (index) => {
    setMarkedForDeletion((prev) => {
      if (prev.includes(index)) {
        return prev.filter((i) => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const handleMarkAllImages = () => {
    if (markedForDeletion.length === portfolioImgs.length) {
      setMarkedForDeletion([]);
    } else {
      setMarkedForDeletion(portfolioImgs.map((_, index) => index));
    }
  };

  const handleImageUpload = async (event) => {
    const files = event.target.files;
    if (!files.length) return;
  
    try {
      // Compress all images
      const processedImages = await processImages(files);
      
      // Check if any processed image is still over 100KB after compression
      const hasOversizedImages = processedImages.some(file => file.size > 100000);
      
      if (hasOversizedImages) {
        setPortfolioImgSizeError(true);
        return;
      }
      
      setPortfolioImgSizeError(false);
      setUploadedPortfolioImages(prev => [...prev, ...processedImages]);
    } catch (error) {
      console.error('Error processing images:', error);
      setPortfolioImgSizeError(true);
    }
  };

  const navigateImages = (direction) => {
    if (direction === "prev") {
      setCurrentModalIndex((prev) =>
        prev === 0 ? portfolioImgs.length - 1 : prev - 1
      );
    } else {
      setCurrentModalIndex((prev) =>
        prev === portfolioImgs.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <div className="mt-5">
      <div className="portfolio-container">
        <h5 className="portfolio-header">Portfolio Photos</h5>
        <div className="portfolio-section">
          {editMode && (
            <div className="border-container-1">
              {uploadedPortfolioImages && (
                <span className="border-label">
                  <h6>Images to Upload</h6>
                </span>
              )}
              <div className="container-fluid mt-4">
                <div className="row g-3">
                  {uploadedPortfolioImages.map((image, index) => (
                    <div
                      key={index}
                      className="col-12 col-md-6 col-lg-4 m-0 p-2 d-flex justify-content-center align-items-center position-relative"
                    >
                      <div
                        className="w-100 position-relative"
                        style={{ aspectRatio: "1" }}
                      >
                        <img
                          className="img-fluid rounded position-absolute portfolio-img"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            left: "50%",
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                          src={URL.createObjectURL(image)}
                          alt={`Uploaded Preview ${index}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setUploadedPortfolioImages((imageList) =>
                              imageList.filter(
                                (_, imageIndex) => imageIndex !== index
                              )
                            )
                          }
                          className="btn btn-outline-danger position-absolute top-0 end-0 d-flex justify-content-center align-items-center"
                          style={{
                            width: "15px",
                            height: "15px",
                            padding: "0",
                            borderRadius: "50%",
                            fontSize: "11px",
                            fontWeight: "bolder",
                            margin: "2px",
                            zIndex: 1,
                          }}
                        >
                          <i className="fa-solid fa-minus"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="row justify-content-center mb-4 mt-3">
                <div className="col-12 px-4">
                  <div className="d-flex flex-column align-items-center">
                    <label
                      className="input-group-text"
                      htmlFor="portfolio-images"
                      style={{ width: "fit-content" }}
                    >
                      <i className="fa-solid fa-upload me-2 d-none d-md-inline" />
                      <span className="d-none d-md-inline">Upload Images</span>
                      <i className="fa-solid fa-upload d-md-none" />
                    </label>
                    <input
                      type="file"
                      className="form-control hide"
                      id="portfolio-images"
                      aria-describedby="inputGroupFileAddon04"
                      aria-label="Upload"
                      multiple
                      onChange={handleImageUpload}
                    />
                    {portfolioImgSizeError && (
                      <div className="text-danger small mt-1 ms-1">
                        Image size should be less than 100KB
                      </div>
                    )}
                    <div className="text-muted text-center small mt-1 align-items-end">
                      {uploadedPortfolioImages.length > 0
                        ? `${uploadedPortfolioImages.length} file${
                            uploadedPortfolioImages.length === 1 ? "" : "s"
                          } selected`
                        : "No files selected"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={editMode ? "border-container" : ""}>
            {editMode && <span className="border-label">Uploaded Images</span>}
            <div className="container-fluid mt-3">
              <div className="row g-3">
                {portfolioImgs &&
                  portfolioImgs.map((image, index) => {
                    const isMarked = markedForDeletion.includes(index);
                    return (
                      <div
                        key={index}
                        className="col-12 col-md-6 col-lg-4 mt-0 p-1 d-flex justify-content-center align-items-center position-relative"
                      >
                        <div className="portfolio-img-wrapper">
                          <img
                            key={index}
                            className="img-fluid portfolio-img"
                            src={image.image_url || image}
                            alt={`Portfolio ${index}`}
                            data-bs-toggle="modal"
                            data-bs-target="#portfolioModal"
                            onClick={() => setCurrentModalIndex(index)}
                            style={{
                              opacity: isMarked ? 0.5 : 1,
                              transition: "opacity 0.3s",
                            }}
                          />
                          {editMode && (
                            <button
                              type="button"
                              onClick={() => toggleImageDeletion(index)}
                              className={`btn ${
                                isMarked ? "btn-success" : "btn-outline-danger"
                              } position-absolute top-0 end-0 d-flex justify-content-center align-items-center`}
                              style={{
                                width: "15px",
                                height: "15px",
                                padding: "0",
                                borderRadius: "50%",
                                fontSize: "12px",
                                fontWeight: "bold",
                                margin: "2px",
                                zIndex: "3"
                              }}
                            >
                              {isMarked ? "↺" : "×"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Shared Modal for all images */}
          <div
            className="modal fade"
            id="portfolioModal"
            tabIndex="-1"
            aria-labelledby="portfolioModalLabel"
            aria-hidden="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
              <div className="modal-content bg-transparent border-0">
                <button
                  type="button"
                  className="btn-close bg-white position-absolute z-10"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  style={{
                    top: "20px",
                    right: "20px",
                    transition: "all 0.2s ease",
                  }}
                />
                {/* <button
                  type="button"
                  className="btn-close bg-white z-10"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    padding: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    opacity: '1',
                    zIndex: '1050',
                    transition: 'all 0.2s ease'
                  }}
                /> */}
                <div className="d-flex justify-content-center align-items-center min-vh-100">
                  {portfolioImgs && portfolioImgs.length > 0 && (
                    <div className="modal-image-container position-relative">
                      <img
                        src={
                          portfolioImgs[currentModalIndex].image_url ||
                          portfolioImgs[currentModalIndex]
                        }
                        alt={`Portfolio ${currentModalIndex}`}
                        className="img-fluid"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                      {/* Close button moved inside the image container */}
                      {/* <button
                        type="button"
                        className="btn-close bg-white z-10"
                        data-bs-dismiss="modal"
                        aria-label="Close"
                      /> */}
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {/* <button
                    className="btn btn-light position-absolute start-0 top-50 translate-middle-y rounded-circle d-flex justify-content-center align-items-center"
                    onClick={() => navigateImages('prev')}
                    style={{
                      width: "35px",
                      height: "35px",
                      marginLeft: "1rem",
                      opacity: "0.7"
                    }}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button> */}
                  <button
                    className="btn btn-light ms-3 position-absolute start-0 top-50 translate-middle-y navigation-arrow"
                    onClick={() => navigateImages("prev")}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>

                  {/* <button
                    className="btn btn-light position-absolute end-0 top-50 translate-middle-y rounded-circle d-flex justify-content-center align-items-center"
                    onClick={() => navigateImages('next')}
                    style={{
                      width: "35px",
                      height: "35px",
                      marginRight: "1rem",
                      opacity: "0.7",
                    }}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button> */}
                  <button
                    className="btn btn-light me-3 position-absolute end-0 top-50 translate-middle-y navigation-arrow"
                    onClick={() => navigateImages("next")}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {editMode && portfolioImgs && portfolioImgs.length > 0 && (
            <div className="d-flex justify-content-center mt-3 px-0">
              <button
                type="button"
                onClick={handleMarkAllImages}
                className={`btn ${
                  markedForDeletion.length === portfolioImgs.length
                    ? "btn-success"
                    : "btn-outline-danger"
                } btn-sm mb-3`}
                style={{
                  transition: "all 0.3s",
                  maxWidth: "250px",
                  width: "100%",
                }}
              >
                <i
                  className={`fa-solid ${
                    markedForDeletion.length === portfolioImgs.length
                      ? "fa-rotate-left"
                      : "fa-xmark"
                  } me-2`}
                ></i>
                {markedForDeletion.length === portfolioImgs.length
                  ? "Unmark All"
                  : "Mark All for Deletion"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortfolioImage;
