import React, { useState } from "react";
import {Link} from "react-router-dom";

const featuredMentors = [
  {
    name: "Sarah W.",
    title: "Software Engineer at Google",
    img: "https://res.cloudinary.com/dufs8hbca/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1725936902/Saved/JulieFace_vulxy2.jpg",
    skills: ["JavaScript", "React", "Agile"]
  },
  {
    name: "Hao R.",
    title: "Full-Stack Developer at Airbnb",
    img: "https://randomuser.me/api/portraits/men/26.jpg",
    skills: ["Node.js", "Vue", "Scrum"]
  },
  {
    name: "Emma J.",
    title: "Data Scientist at Microsoft",
    img: "https://randomuser.me/api/portraits/women/79.jpg",
    skills: ["Python", "Pandas", "Machine Learning"]
  },
  {
    name: "Raj P.",
    title: "Mobile Developer at Spotify",
    img: "https://randomuser.me/api/portraits/men/65.jpg",
    skills: ["Kotlin", "Swift", "Agile"]
  },
  {
    name: "Priya K.",
    title: "AI Researcher at Meta",
    img: "https://randomuser.me/api/portraits/women/50.jpg",
    skills: ["PyTorch", "Deep Learning", "ML Ops"]
  },
  {
    name: "Luis M.",
    title: "DevOps Engineer at Netflix",
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    skills: ["Docker", "Kubernetes", "CI/CD"]
  },
  {
    name: "Alicia N.",
    title: "UX Designer at Apple",
    img: "https://randomuser.me/api/portraits/women/60.jpg",
    skills: ["Figma", "User Research", "Prototyping"]
  },
  {
    name: "Daniel T.",
    title: "Cloud Architect at Amazon",
    img: "https://randomuser.me/api/portraits/men/31.jpg",
    skills: ["AWS", "Terraform", "Microservices"]
  },
  {
    name: "Mina L.",
    title: "Front-End Engineer at Adobe",
    img: "https://randomuser.me/api/portraits/women/22.jpg",
    skills: ["HTML", "CSS", "React"]
  },
  {
    name: "Yuki S.",
    title: "ML Engineer at NVIDIA",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
    skills: ["NLP", "CUDA", "TensorFlow"]
  },
  {
    name: "Carlos G.",
    title: "Cybersecurity Expert at IBM",
    img: "https://randomuser.me/api/portraits/men/36.jpg",
    skills: ["Security", "Pen Testing", "SOC"]
  },
  {
    name: "Amira D.",
    title: "Technical PM at Oracle",
    img: "https://randomuser.me/api/portraits/women/39.jpg",
    skills: ["Scrum", "JIRA", "Stakeholder Management"]
  },
  {
    name: "James B.",
    title: "Blockchain Developer at Ripple",
    img: "https://randomuser.me/api/portraits/men/52.jpg",
    skills: ["Solidity", "Ethereum", "Smart Contracts"]
  }
];



const MentorCard = ({ name, title, img, skills }) => (
  <div className="card m-2 text-center" style={{ width: "150px" }}>
    <img src={img} className="card-img-top rounded-circle p-2" alt={name} />
    <div className="card-body">
      <h6 className="card-title mb-1">{name}</h6>
      <p className="card-text small text-muted">{title}</p>
      {skills && <p className="small text-secondary">{skills.join(", ")}</p>}
    </div>
  </div>
);




const LandingPage = () => {
  

  return (
    <div className="bg-light min-vh-100">
      <header className=" hero">
        
          <h1 className="header-background">Learn from the best. Find your mentor.</h1>
          <p className="lead header-background text-white">
            devMentor is the easiest way to connect with experienced developers
            for one-on-one mentorship. Whether you're new to coding or an
            experienced developer looking to level up, we'll help you find the
            perfect mentor.
          </p>
        
      </header>

      <section className="featured-mentors">
        <div className="container">
          <h2>Featured mentors</h2>
          <div
            id="featuredCarousel"
            className="carousel slide w-75 mx-auto mb-5"
            data-bs-ride="carousel"
          >
            <div className="carousel-inner">
              {featuredMentors
                .reduce((acc, _, index) => {
                  if (index % 3 === 0) {
                    acc.push(featuredMentors.slice(index, index + 3));
                  }
                  return acc;
                }, [])
                .map((mentorGroup, groupIndex) => (
                  <div
                    key={groupIndex}
                    className={`carousel-item ${groupIndex === 0 ? "active" : ""
                      }`}
                  >
                    <div className="row justify-content-center">
                      {mentorGroup.map((mentor, index) => (
                        <div className="col-md-4" key={index}>
                          <div className="mentor-profile-card mx-auto text-center p-3">
                            <img
                              src={mentor.img}
                              alt={mentor.name}
                              className="mentor-image mb-3"
                            />
                            <h3>{mentor.name}</h3>
                            <p>{mentor.title}</p>
                            <p className="text-secondary small">{mentor.skills.join(", ")}</p>
                            <div className="social-icon-list social-links-footer">
                              <a
                                href={mentor.linkedin || "#"}
                                className="social-icon-footer"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="fa-brands fa-linkedin-in"></i>
                              </a>
                              <a
                                href={mentor.facebook || "#"}
                                className="social-icon-footer"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="fa-brands fa-square-facebook"></i>
                              </a>
                              <a
                                href={mentor.instagram || "#"}
                                className="social-icon-footer"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="fa-brands fa-instagram"></i>
                              </a>
                              <a
                                href={mentor.github || "#"}
                                className="social-icon-footer"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <i className="fa-brands fa-square-github"></i>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <button
              className="carousel-control-prev featured-carousel-btn"
              type="button"
              data-bs-target="#featuredCarousel"
              data-bs-slide="prev"
            >
              <span className="carousel-control-prev-icon featured-carousel-icon-dark"></span>
            </button>
            <button
              className="carousel-control-next featured-carousel-btn"
              type="button"
              data-bs-target="#featuredCarousel"
              data-bs-slide="next"
            >
              <span className="carousel-control-next-icon featured-carousel-icon-dark"></span>
            </button>

          </div>
        </div>
      </section>

      <section className="why-devmentor">
				<div className="container">
					<h2>Get it done</h2>
          
					<div className="row">
            	<div className="col-md-3">
                <Link to="/mentor-list" className="feature-card">
                <div className="feature-card">
								<img src="https://res.cloudinary.com/dufs8hbca/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1725933626/Saved/mentorSession1_gigjmn.jpg" alt="Learn by doing" className="feature-image" />
								<h3>Find the right professional</h3>
								<p>Work on real projects and learn by building things you care about.</p>
							</div>
                </Link>
							
						</div>
						<div className="col-md-3">
							<div className="feature-card">
								<img src="https://res.cloudinary.com/dufs8hbca/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1725933626/Saved/mentorSession1_gigjmn.jpg" alt="Learn by doing" className="feature-image" />
								<h3>Learn by doing</h3>
								<p>Work on real projects and learn by building things you care about.</p>
							</div>
						</div>
						<div className="col-md-3">
							<div className="feature-card">
								<img src="https://res.cloudinary.com/dufs8hbca/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1725933624/Saved/GroupMentorSessionElder1_ydoslt.jpg" alt="Real-world projects" className="feature-image" />
								<h3>Real-world projects</h3>
								<p>Get help with your personal coding projects from experienced developers.</p>
							</div>
						</div>
						<div className="col-md-3">
							<div className="feature-card">
								<img src="https://res.cloudinary.com/dufs8hbca/image/upload/w_1000,ar_16:9,c_fill,g_auto,e_sharpen/v1725935854/Saved/1on1MentorSession_vwg4jh.jpg" alt="Personalized learning" className="feature-image" />
								<h3>Personalized learning</h3>
								<p>Learn at your own pace with personalized guidance and feedback.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

     
    </div>

  );
};

export default LandingPage;
