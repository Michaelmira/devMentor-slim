

import React, { useEffect, useContext, useState } from "react";
import { Context } from "../store/appContext";
import { MapPin } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

import {
  skillsList,
  daysOfTheWeek,
  stateOptions,
  countryOptions,
  specialtiesList,
} from "../store/data";



const SpecialtyFilter = ({ selectedSpecialties, setSelectedSpecialties }) => {
  const allSpecialties = specialtiesList.map(s => s.label);

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

  const filteredMentors = store.mentors?.filter((mentor) => {
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
      selectedSpecialties.some(sel =>
        mentor.specialties?.includes(sel)
      );

    return matchesTags && matchesSpecialty;
  });






  return (


    <>
    
      <section className="mt-5">
        <h1 className="text-center mb-2">Find Your Coding Mentor</h1>
        <p className="text-center mb-3">Get guidance from experienced developers</p>

        <SpecialtyFilter
          allMentors={store.mentors}
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
              <div className="d-flex overflow-auto justify-content-center py-2 px-1">
                {mentorGroup.map((mentor, groupIndex) => (
                  <div key={groupIndex} className="card m-2 text-center" style={{ width: "300px" }}>
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
                      <h6 className="card-title mb-1">
                        {`${mentor.first_name} ${mentor.last_name} `}
                        {mentor.is_active && (
                            
                              <i class="fa-solid fa-circle text-success fs-6"></i>
                            
                          )}
                      </h6>
                      <p className="card-text small text-muted">{mentor.title}</p>  

                      {(mentor.city || mentor.country) && (
                        <p className="small text-secondary">
                          <strong>Location:</strong> {mentor.city}, {mentor.country}
                        </p>
                      )}
                      {mentor.specialties && mentor.specialties.length > 0 && (
                        <p className="small text-secondary">
                          <strong>Specialties:</strong> {mentor.specialties.join(", ")}
                        </p>
                      )}
                      {mentor.skills && mentor.skills.length > 0 && (
                        <p className="small text-secondary">
                          <strong>Skills:</strong> {mentor.skills.join(", ")}
                        </p>
                      )}
                    
                      {mentor.about_me && (
                        <p className="small text-secondary">
                          <strong>About:</strong> {mentor.about_me}
                        </p>
                      )}
                      
                      {mentor.years_exp && (
                        <p className="small text-secondary">
                          <strong>Experience:</strong> {mentor.years_exp} years
                        </p>
                      )}
                      {mentor.price && mentor.price !== "None" && (
                        <p className="small text-secondary">
                          <strong>Price:</strong>  ${mentor.price}/session
                        </p>
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
                    </div>
                    <Link to={`/mentor-details/${mentor.id}`} className="text-decoration-none text-dark">
                      <div className="d-grid gap-2">
                        <div className="btn btn-primary">
                          Book this Mentor Now!
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}

              </div>
            ))}
        </div>
      </section>
    </>
  );
};

