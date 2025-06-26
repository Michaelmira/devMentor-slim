import React, { useState } from "react";

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

const allMentors = [
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
  },
  {
    name: "Nina C.",
    title: "Data Analyst at LinkedIn",
    img: "https://randomuser.me/api/portraits/women/12.jpg",
    skills: ["SQL", "Tableau", "Data Visualization"]
  },
  {
    name: "Arjun N.",
    title: "Backend Engineer at Dropbox",
    img: "https://randomuser.me/api/portraits/men/28.jpg",
    skills: ["Go", "PostgreSQL", "APIs"]
  },
  {
    name: "Lina M.",
    title: "Product Designer at Figma",
    img: "https://randomuser.me/api/portraits/women/34.jpg",
    skills: ["Wireframes", "UX Writing", "Figma"]
  },
  {
    name: "Marcus Z.",
    title: "Systems Engineer at Cisco",
    img: "https://randomuser.me/api/portraits/men/41.jpg",
    skills: ["Networking", "Linux", "Firewall Config"]
  },
  {
    name: "Tanya R.",
    title: "Cloud Engineer at Salesforce",
    img: "https://randomuser.me/api/portraits/women/31.jpg",
    skills: ["GCP", "CI/CD", "Kubernetes"]
  },
  {
    name: "Ivan D.",
    title: "Automation Engineer at Tesla",
    img: "https://randomuser.me/api/portraits/men/61.jpg",
    skills: ["Python", "Selenium", "Robotics"]
  },
  {
    name: "Elena T.",
    title: "QA Lead at Atlassian",
    img: "https://randomuser.me/api/portraits/women/71.jpg",
    skills: ["Test Automation", "Jest", "Regression Testing"]
  },
  {
    name: "Kofi A.",
    title: "Game Developer at Unity",
    img: "https://randomuser.me/api/portraits/men/14.jpg",
    skills: ["C#", "Unity", "Game Physics"]
  },
  {
    name: "Mariana L.",
    title: "VR Developer at Oculus",
    img: "https://randomuser.me/api/portraits/women/28.jpg",
    skills: ["C++", "3D Modeling", "VR SDKs"]
  },
  {
    name: "Peter J.",
    title: "Site Reliability Engineer at Slack",
    img: "https://randomuser.me/api/portraits/men/66.jpg",
    skills: ["Monitoring", "PagerDuty", "On-call"]
  },
  {
    name: "Anya B.",
    title: "AI Ethics Researcher at OpenAI",
    img: "https://randomuser.me/api/portraits/women/15.jpg",
    skills: ["AI Safety", "Policy", "Research"]
  },
  {
    name: "Derek F.",
    title: "Tech Lead at GitHub",
    img: "https://randomuser.me/api/portraits/men/76.jpg",
    skills: ["Leadership", "Code Review", "Dev Culture"]
  },
  {
    name: "Sana Y.",
    title: "Data Engineer at Snowflake",
    img: "https://randomuser.me/api/portraits/women/65.jpg",
    skills: ["ETL", "Data Warehousing", "SQL"]
  },
  {
    name: "Leo H.",
    title: "AI Engineer at Hugging Face",
    img: "https://randomuser.me/api/portraits/men/11.jpg",
    skills: ["Transformers", "LLMs", "Fine-Tuning"]
  },
  {
    name: "Nora Q.",
    title: "Security Analyst at Cloudflare",
    img: "https://randomuser.me/api/portraits/women/33.jpg",
    skills: ["Threat Detection", "Firewall", "Zero Trust"]
  },
  {
    name: "Isaac T.",
    title: "Full-Stack Developer at Shopify",
    img: "https://randomuser.me/api/portraits/men/84.jpg",
    skills: ["Ruby on Rails", "React", "GraphQL"]
  },
  {
    name: "Claire D.",
    title: "IoT Developer at Samsung",
    img: "https://randomuser.me/api/portraits/women/19.jpg",
    skills: ["C", "Embedded Systems", "IoT"]
  },
  {
    name: "Mohammed B.",
    title: "AI Product Manager at DeepMind",
    img: "https://randomuser.me/api/portraits/men/29.jpg",
    skills: ["Product Strategy", "AI Use Cases", "Stakeholder Alignment"]
  },
  {
    name: "Talia V.",
    title: "Creative Technologist at Pinterest",
    img: "https://randomuser.me/api/portraits/women/77.jpg",
    skills: ["Interactive Design", "WebGL", "Creative Code"]
  },
  {
    name: "Jorge L.",
    title: "Infrastructure Engineer at Stripe",
    img: "https://randomuser.me/api/portraits/men/53.jpg",
    skills: ["Terraform", "Scaling", "Resilience"]
  },
  {
    name: "Bea H.",
    title: "Robotics Engineer at Boston Dynamics",
    img: "https://randomuser.me/api/portraits/women/26.jpg",
    skills: ["ROS", "Control Systems", "Simulations"]
  },
  {
    name: "Victor S.",
    title: "Web Developer at Wix",
    img: "https://randomuser.me/api/portraits/men/21.jpg",
    skills: ["JavaScript", "HTML/CSS", "SEO"]
  },
  {
    name: "Ella G.",
    title: "EdTech Specialist at Khan Academy",
    img: "https://randomuser.me/api/portraits/women/17.jpg",
    skills: ["Curriculum Design", "Tech for Learning", "Education"]
  },
  {
    name: "Andre M.",
    title: "Mobile Architect at Square",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
    skills: ["React Native", "App Architecture", "State Management"]
  },
  {
    name: "Jin W.",
    title: "Bioinformatics Engineer at Illumina",
    img: "https://randomuser.me/api/portraits/men/88.jpg",
    skills: ["Genomics", "R", "Data Pipelines"]
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

const HorizontalScroll = ({ mentors }) => (
  <div className="d-flex overflow-auto justify-content-center py-2 px-1">
    {mentors.map((mentor, index) => (
      <MentorCard key={index} {...mentor} />
    ))}
  </div>
);

const LandingPage = () => {
  const [searchTags, setSearchTags] = useState("");

  const filteredMentors = allMentors.filter((mentor) => {
    if (!searchTags) return true;

    const tags = searchTags.split(",").map((tag) => tag.trim().toLowerCase());
    return tags.every((tag) =>
      mentor.skills?.some((skill) => skill.toLowerCase().includes(tag))
    );
  });

  return (
    <div className="container-fluid bg-light min-vh-100 p-4">
      <header className="container hero">
        <div className="container">
          <h1 className="header-background">Learn from the best. Find your mentor.</h1>
          <p className="lead header-background text-white">
            devMentor is the easiest way to connect with experienced developers
            for one-on-one mentorship. Whether you're new to coding or an
            experienced developer looking to level up, we'll help you find the
            perfect mentor.
          </p>
        </div>
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
      <section>

        <h1 className="text-center mb-2">Find Your Coding Mentor</h1>
        <p className="text-center mb-5">Get guidance from experienced developers</p>

        <div className="mb-3 w-50 mx-auto">
          <input
            type="text"
            className="form-control"
            placeholder="Search mentors by tags, e.g. React, Java, Agile"
            value={searchTags}
            onChange={(e) => setSearchTags(e.target.value)}
          />
        </div>
        <div className="mb-3 mx-auto">
          {filteredMentors
            .reduce((acc, _, index) => {
              if (index % 10 === 0) {
                acc.push(filteredMentors.slice(index, index + 10));
              }
              return acc;
            }, [])
            .map((mentorGroup, groupIndex) => (
              <HorizontalScroll key={groupIndex} mentors={mentorGroup} />
            ))}
        </div>
      </section>
    </div>

  );
};

export default LandingPage;
