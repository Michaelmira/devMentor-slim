

import React, { useEffect, useContext, useState } from "react";
import { Context } from "../store/appContext";
import { MapPin } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

const allMentors = [
  { name: "Sarah W.", title: "Software Engineer at Google", img: "https://res.cloudinary.com/dufs8hbca/image/upload/w_1000,ar_1:1,c_fill,g_auto,e_art:hokusai/v1725936902/Saved/JulieFace_vulxy2.jpg", skills: ["JavaScript", "React", "Agile"], specialty: "Software Development" },
  { name: "Hao R.", title: "Full-Stack Developer at Airbnb", img: "https://randomuser.me/api/portraits/men/26.jpg", skills: ["Node.js", "Vue", "Scrum"], specialty: "Full-Stack Development" },
  { name: "Emma J.", title: "Data Scientist at Microsoft", img: "https://randomuser.me/api/portraits/women/79.jpg", skills: ["Python", "Pandas", "Machine Learning"], specialty: "Data Science" },
  { name: "Raj P.", title: "Mobile Developer at Spotify", img: "https://randomuser.me/api/portraits/men/65.jpg", skills: ["Kotlin", "Swift", "Agile"], specialty: "Mobile Development" },
  { name: "Priya K.", title: "AI Researcher at Meta", img: "https://randomuser.me/api/portraits/women/50.jpg", skills: ["PyTorch", "Deep Learning", "ML Ops"], specialty: "Artificial Intelligence" },
  { name: "Luis M.", title: "DevOps Engineer at Netflix", img: "https://randomuser.me/api/portraits/men/45.jpg", skills: ["Docker", "Kubernetes", "CI/CD"], specialty: "DevOps" },
  { name: "Alicia N.", title: "UX Designer at Apple", img: "https://randomuser.me/api/portraits/women/60.jpg", skills: ["Figma", "User Research", "Prototyping"], specialty: "User Experience Design" },
  { name: "Daniel T.", title: "Cloud Architect at Amazon", img: "https://randomuser.me/api/portraits/men/31.jpg", skills: ["AWS", "Terraform", "Microservices"], specialty: "Cloud Architecture" },
  { name: "Mina L.", title: "Front-End Engineer at Adobe", img: "https://randomuser.me/api/portraits/women/22.jpg", skills: ["HTML", "CSS", "React"], specialty: "Front-End Development" },
  { name: "Yuki S.", title: "ML Engineer at NVIDIA", img: "https://randomuser.me/api/portraits/women/44.jpg", skills: ["NLP", "CUDA", "TensorFlow"], specialty: "Machine Learning" },
  { name: "Carlos G.", title: "Cybersecurity Expert at IBM", img: "https://randomuser.me/api/portraits/men/36.jpg", skills: ["Security", "Pen Testing", "SOC"], specialty: "Cybersecurity" },
  { name: "Amira D.", title: "Technical PM at Oracle", img: "https://randomuser.me/api/portraits/women/39.jpg", skills: ["Scrum", "JIRA", "Stakeholder Management"], specialty: "Technical Project Management" },
  { name: "James B.", title: "Blockchain Developer at Ripple", img: "https://randomuser.me/api/portraits/men/52.jpg", skills: ["Solidity", "Ethereum", "Smart Contracts"], specialty: "Blockchain Technology" },
  { name: "Nina C.", title: "Data Analyst at LinkedIn", img: "https://randomuser.me/api/portraits/women/12.jpg", skills: ["SQL", "Tableau", "Data Visualization"], specialty: "Data Analysis" },
  { name: "Arjun N.", title: "Backend Engineer at Dropbox", img: "https://randomuser.me/api/portraits/men/28.jpg", skills: ["Go", "PostgreSQL", "APIs"], specialty: "Backend Development" },
  { name: "Lina M.", title: "Product Designer at Figma", img: "https://randomuser.me/api/portraits/women/34.jpg", skills: ["Wireframes", "UX Writing", "Figma"], specialty: "Product Design" },
  { name: "Marcus Z.", title: "Systems Engineer at Cisco", img: "https://randomuser.me/api/portraits/men/41.jpg", skills: ["Networking", "Linux", "Firewall Config"], specialty: "IT Infrastructure" },
  { name: "Tanya R.", title: "Cloud Engineer at Salesforce", img: "https://randomuser.me/api/portraits/women/31.jpg", skills: ["GCP", "CI/CD", "Kubernetes"], specialty: "Cloud Engineering" },
  { name: "Ivan D.", title: "Automation Engineer at Tesla", img: "https://randomuser.me/api/portraits/men/61.jpg", skills: ["Python", "Selenium", "Robotics"], specialty: "Automation Engineering" },
  { name: "Elena T.", title: "QA Lead at Atlassian", img: "https://randomuser.me/api/portraits/women/71.jpg", skills: ["Test Automation", "Jest", "Regression Testing"], specialty: "Quality Assurance" },
  { name: "Kofi A.", title: "Game Developer at Unity", img: "https://randomuser.me/api/portraits/men/14.jpg", skills: ["C#", "Unity", "Game Physics"], specialty: "Game Development" },
  { name: "Mariana L.", title: "VR Developer at Oculus", img: "https://randomuser.me/api/portraits/women/28.jpg", skills: ["C++", "3D Modeling", "VR SDKs"], specialty: "Virtual Reality" },
  { name: "Peter J.", title: "Site Reliability Engineer at Slack", img: "https://randomuser.me/api/portraits/men/66.jpg", skills: ["Monitoring", "PagerDuty", "On-call"], specialty: "Site Reliability Engineering" },
  { name: "Anya B.", title: "AI Ethics Researcher at OpenAI", img: "https://randomuser.me/api/portraits/women/15.jpg", skills: ["AI Safety", "Policy", "Research"], specialty: "AI Ethics" },
  { name: "Derek F.", title: "Tech Lead at GitHub", img: "https://randomuser.me/api/portraits/men/76.jpg", skills: ["Leadership", "Code Review", "Dev Culture"], specialty: "Technical Leadership" },
  { name: "Sana Y.", title: "Data Engineer at Snowflake", img: "https://randomuser.me/api/portraits/women/65.jpg", skills: ["ETL", "Data Warehousing", "SQL"], specialty: "Data Engineering" },
  { name: "Leo H.", title: "AI Engineer at Hugging Face", img: "https://randomuser.me/api/portraits/men/11.jpg", skills: ["Transformers", "LLMs", "Fine-Tuning"], specialty: "AI Engineering" },
  { name: "Nora Q.", title: "Security Analyst at Cloudflare", img: "https://randomuser.me/api/portraits/women/33.jpg", skills: ["Threat Detection", "Firewall", "Zero Trust"], specialty: "Information Security" },
  { name: "Isaac T.", title: "Full-Stack Developer at Shopify", img: "https://randomuser.me/api/portraits/men/84.jpg", skills: ["Ruby on Rails", "React", "GraphQL"], specialty: "Full-Stack Development" },
  { name: "Claire D.", title: "IoT Developer at Samsung", img: "https://randomuser.me/api/portraits/women/19.jpg", skills: ["C", "Embedded Systems", "IoT"], specialty: "Internet of Things" },
  { name: "Mohammed B.", title: "AI Product Manager at DeepMind", img: "https://randomuser.me/api/portraits/men/29.jpg", skills: ["Product Strategy", "AI Use Cases", "Stakeholder Alignment"], specialty: "AI Product Management" },
  { name: "Talia V.", title: "Creative Technologist at Pinterest", img: "https://randomuser.me/api/portraits/women/77.jpg", skills: ["Interactive Design", "WebGL", "Creative Code"], specialty: "Creative Technology" },
  { name: "Jorge L.", title: "Infrastructure Engineer at Stripe", img: "https://randomuser.me/api/portraits/men/53.jpg", skills: ["Terraform", "Scaling", "Resilience"], specialty: "Infrastructure Engineering" },
  { name: "Bea H.", title: "Robotics Engineer at Boston Dynamics", img: "https://randomuser.me/api/portraits/women/26.jpg", skills: ["ROS", "Control Systems", "Simulations"], specialty: "Robotics" },
  { name: "Victor S.", title: "Web Developer at Wix", img: "https://randomuser.me/api/portraits/men/21.jpg", skills: ["JavaScript", "HTML/CSS", "SEO"], specialty: "Web Development" },
  { name: "Ella G.", title: "EdTech Specialist at Khan Academy", img: "https://randomuser.me/api/portraits/women/17.jpg", skills: ["Curriculum Design", "Tech for Learning", "Education"], specialty: "Educational Technology" },
  { name: "Andre M.", title: "Mobile Architect at Square", img: "https://randomuser.me/api/portraits/men/32.jpg", skills: ["React Native", "App Architecture", "State Management"], specialty: "Mobile Architecture" },
  { name: "Jin W.", title: "Bioinformatics Engineer at Illumina", img: "https://randomuser.me/api/portraits/men/88.jpg", skills: ["Genomics", "R", "Data Pipelines"], specialty: "Bioinformatics" }
];

const SpecialtyFilter = ({ allMentors, selectedSpecialties, setSelectedSpecialties }) => {
  const allSpecialties = [...new Set(allMentors.map(m => m.specialty).filter(Boolean))];

  const toggleSpecialty = (specialty) => {
    if (selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
    } else {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const availableSpecialties = allSpecialties.filter(s => !selectedSpecialties.includes(s));

  return (
    <div className="container mb-4">
      {selectedSpecialties.length > 0 && (
        <div className="mb-3 text-center">
          <h6 className="mb-2">Selected Specialties:</h6>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            {selectedSpecialties.map((specialty, index) => (
              <button
                key={index}
                className="btn btn-sm btn-primary rounded-pill"
                onClick={() => toggleSpecialty(specialty)}
              >
                {specialty} &times;
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="text-center">
        <h6 className="mb-2">Available Specialties:</h6>
        <div className="d-flex flex-wrap gap-2 justify-content-center">
          {availableSpecialties.map((specialty, index) => (
            <button
              key={index}
              className="btn btn-sm btn-outline-primary rounded-pill"
              onClick={() => toggleSpecialty(specialty)}
            >
              {specialty}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


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

export const MentorList = () => {

  
  const { store, actions } = useContext(Context);
  const navigate = useNavigate();

  const [searchTags, setSearchTags] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);

  useEffect(() => {
    actions.getMentors();
  }, []);

  const handleNavigateToInstantSession = (mentorId) => {
    navigate(`/create-instant-session/${mentorId}`);
  };

  const filteredMentors = allMentors.filter((mentor) => {
    const tags = searchTags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    const matchesTags =
      tags.length === 0 ||
      tags.every((tag) =>
        mentor.skills?.some((skill) => skill.toLowerCase().includes(tag))
      );

    const matchesSpecialty =
      selectedSpecialties.length === 0 ||
      selectedSpecialties.includes(mentor.specialty);

    return matchesTags && matchesSpecialty;
  });

  

    


    return (


        <>
            <div className="container card  border-secondary shadow border-2 px-0 mt-5">
                <div id="header" className="card-header bg-light-subtle mb-5">
                    <h1 className="text-center mt-5">Available Mentors</h1>
                </div>
                <div className="sessions-dashboard">

                    <div className="container-fluid">
                        <div className="row">
                            {store.mentors.map((mentor) => (

                                <div key={mentor.id} className="col-12 col-sm-6 col-md-4 col-lg-2.4 col-xl mb-4">
                                    <Link to={`/mentor-details/${mentor.id}`} className="text-decoration-none text-dark">
                                        <div className="card h-100">
                                            {/* Card Image */}
                                            <div className="card-img-top d-flex justify-content-center align-items-center" style={{ height: '200px', background: '#f8f9fa' }}>
                                                {mentor.profile_photo ? (
                                                    <div style={{ width: '150px', height: '150px' }}>
                                                        <img
                                                            src={mentor.profile_photo.image_url}
                                                            alt={`${mentor.first_name} ${mentor.last_name}`}
                                                            className="w-100 h-100 rounded-circle"
                                                            style={{ objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#e9ecef' }}></div>
                                                )}
                                            </div>

                                            <div className="card-body">
                                                {/* Header Section */}
                                                <div className="row align-items-center justify-content-center mb-3">
                                                    <div className="col-auto">
                                                        <h3 className="mb-0 fs-5">
                                                            {mentor.first_name || mentor.last_name ?
                                                                `${mentor.first_name} ${mentor.last_name}` :
                                                                'Unnamed Mentor'}
                                                        </h3>
                                                    </div>
                                                    {mentor.is_active && (
                                                        <div className="col-auto">
                                                            <span className="badge bg-success">Active</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Location and Contact */}
                                                <div className="container-fluid mb-3">
                                                    <div className="row">
                                                        <div className="col-12 mb-2">
                                                            <div className="d-flex align-items-center">
                                                                <MapPin size={16} className="me-2" />
                                                                <span className="small">{mentor.city}, {mentor.what_state}, {mentor.country}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Experience and Price */}
                                                <div className="container-fluid justify-content-between d-flex mb-3">
                                                    <div className="row w-100">
                                                        <div className="col-6">
                                                            {mentor.years_exp && (
                                                                <div className="small">
                                                                    <label><strong>Experience:</strong></label>
                                                                    <div>{mentor.years_exp}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-6">
                                                            {mentor.price && mentor.price !== "None" && (
                                                                <div className="small">
                                                                    <label><strong>Price:</strong></label>
                                                                    <div>${mentor.price}/session</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Skills */}
                                                {mentor.skills && mentor.skills.length > 0 && (
                                                    <div className="mb-3">
                                                        <label className="fw-bold mb-2 small">Skills</label>
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {mentor.skills.map((skill, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="badge bg-primary small"
                                                                >
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Available Days */}
                                                {mentor.days && mentor.days.length > 0 && (
                                                    <div className="mb-3">
                                                        <label className="fw-bold mb-2 small">Available Days</label>
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {mentor.days.map((day, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="badge bg-secondary small"
                                                                >
                                                                    {day}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* About Me Section without modal trigger */}
                                                {mentor.about_me && (
                                                    <div>
                                                        <label className="fw-bold mb-2 small">About</label>
                                                        <p className="card-text text-truncate small">
                                                            {mentor.about_me}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Static "Book this Mentor" text instead of button */}
                                                <div className="d-grid gap-2">
                                                    <div className="btn btn-primary">
                                                        Book this Mentor Now!
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

    <section className="mt-5">
      <h1 className="text-center mb-2">Find Your Coding Mentor</h1>
      <p className="text-center mb-3">Get guidance from experienced developers</p>

      <SpecialtyFilter
        allMentors={allMentors}
        selectedSpecialties={selectedSpecialties}
        setSelectedSpecialties={setSelectedSpecialties}
      />

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
    </>
  );
};
