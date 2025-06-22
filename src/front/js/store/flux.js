const getState = ({ getStore, getActions, setStore }) => {
    return {
        store: {
            isMentorLoggedIn: sessionStorage.getItem("isMentorLoggedIn") === "true" || false,
            isCustomerLoggedIn: sessionStorage.getItem("isCustomerLoggedIn") === "true" || false,
            mentors: [],
            mentor: null,
            selectedSession: null,
            currentUserData: JSON.parse(sessionStorage.getItem("currentUserData")) || null,
            sessionRequests: [],
            customerId: sessionStorage.getItem("customerId") || null,
            mentorId: sessionStorage.getItem("mentorId") || null,
            customerSessions: [],
            messages: [],
            token: sessionStorage.getItem("token") || null,
            calendlyURL: null, // To store the mentor's Calendly URL
            userInfo: {
                email: "",
                firstName: "",
                lastName: ""
            }
        },

        actions: {
            getCurrentUser: async () => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/current/user`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + sessionStorage.getItem('token')
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.role == "mentor") {
                            setStore({
                                isMentorLoggedIn: true,
                                currentUserData: data,
                                mentorId: data.user_data.id
                            });
                            return true;
                        }
                        if (data.role == "customer") {
                            setStore({
                                isCustomerLoggedIn: true,
                                currentUserData: data,
                                customerId: data.user_data.id
                            });
                            return true;
                        }
                    } else {
                        console.error("get current user status:", response.status);
                        getActions().logOut();
                        alert("Your login token has expired. Please log in again to continue.");
                        return false;
                    }
                } catch (error) {
                    console.error("Failed to fetch current user:", error);
                    getActions().logOut();
                    alert("Token has expired. Please log in again to continue.");
                    return false;
                }
            },

            checkStorage: async () => {
                const token = sessionStorage.getItem("token");
                const customerId = sessionStorage.getItem("customerId");

                if (token && customerId) {
                    setStore({
                        token: token,
                        customerId: customerId,
                        isLoggedIn: true
                    });
                    return true;
                }
                return false;
            },

            checkStorageMentor: async () => {
                const token = sessionStorage.getItem("token");
                const mentorId = sessionStorage.getItem("mentorId");

                if (token && mentorId) {
                    setStore({
                        token: token,
                        mentorId: mentorId,
                        isMentorLoggedIn: true
                    });
                    return true;
                }
                return false;
            },

            signUpMentor: async (mentor) => {
                try {
                    const response = await fetch(
                        process.env.BACKEND_URL + "/api/mentor/signup", {
                        method: "POST",
                        body: JSON.stringify({
                            first_name: mentor.first_name,
                            email: mentor.email.toLowerCase(),
                            password: mentor.password,
                            last_name: mentor.last_name,
                            city: mentor.city,
                            what_state: mentor.what_state,
                            country: mentor.country,
                            phone: mentor.phone
                        }),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
                    const responseBody = await response.json();

                    if (response.status === 201) {
                        console.log(responseBody);
                        return {
                            success: true,
                            message: responseBody.msg || "Account successfully created! Please log in."
                        };
                    } else {
                        return {
                            message: false,
                            message: responseBody.msg || "An error occurred during sign up."
                        };
                    }
                } catch (error) {
                    console.error("Signup error:, error");
                    return {
                        success: false,
                        message: "An unexpected error occured. Please try again later."
                    }
                }

            },

            logInMentor: async (mentor) => {
                try {
                    const response = await fetch(process.env.BACKEND_URL + "/api/mentor/login", {
                        method: "POST",
                        body: JSON.stringify({
                            email: mentor.email.toLowerCase(),
                            password: mentor.password
                        }),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
                    const data = await response.json();
                    if (response.status !== 200) {
                        return { success: false, message: data.msg || "Login failed" };
                    }

                    // Clean up any modal artifacts before setting store state
                    const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                    while (modalBackdrops.length > 0) {
                        modalBackdrops[0].remove();
                    }
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';

                    // Clear any existing modals from the DOM
                    const modals = document.getElementsByClassName('modal');
                    Array.from(modals).forEach(modal => {
                        modal.style.display = 'none';
                        modal.classList.remove('show');
                        modal.setAttribute('aria-hidden', 'true');
                        modal.removeAttribute('aria-modal');
                    });

                    setStore({
                        token: data.access_token,
                        isMentorLoggedIn: true,
                        mentorId: data.mentor_id,
                        currentUserData: data.mentor_data,
                    });
                    sessionStorage.setItem("token", data.access_token);
                    sessionStorage.setItem("isMentorLoggedIn", "true");
                    sessionStorage.setItem("mentorId", data.mentor_id);
                    sessionStorage.setItem("currentUserData", JSON.stringify(data.mentor_data));
                    return { success: true };
                } catch (error) {
                    console.error("Login error:", error);
                    return { success: false, message: "An unexpected error occurred." };
                }
            },

            getMentors: async () => {
                const store = getStore();
                const token = sessionStorage.getItem("token");

                if (token) {
                    console.log("User is authenticated");
                }

                const response = await fetch(`${process.env.BACKEND_URL}/api/mentorsnosession`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                })
                if (response.ok) {
                    const data = await response.json();
                    setStore({ ...store, mentors: data });
                    return true;
                } else {
                    console.error("Failed to fetch all Mentors:", response.status)
                    return false;
                }
            },

            getMentorById: async (mentorId) => {
                try {
                    const store = getStore();
                    const token = sessionStorage.getItem("token");

                    if (!token) {
                        console.error("No token found in sessionStorage");
                        return false;
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/${mentorId}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    // Update both mentor and selectedMentor in the store
                    setStore({
                        ...store,
                        mentor: data,
                        selectedMentor: data
                    });

                    return true;
                } catch (error) {
                    console.error("Error fetching mentor:", error);
                    return false;
                }
            },

            getCurrentMentor: async () => {
                try {
                    const resp = await fetch(process.env.BACKEND_URL + "/api/mentor", {
                        headers: {
                            Authorization: "Bearer " + getStore().token
                        }
                    })
                    if (resp.ok) {
                        const data = await resp.json();
                        setStore({ mentor: data });
                        return data;
                    } else {
                        console.error("Failed to fetch mentor data:", resp.status);
                        return null;
                    }
                } catch (error) {
                    console.error("Error fetching mentor data:", error);
                    return null;
                }
            },

            editMentor: async (mentor) => {
                console.log("Updating mentor with data:", mentor);
                const token = getStore().token;
                console.log("Token being used:", token);
                console.log("Updating mentor with data:", mentor);
                const response = await fetch(
                    process.env.BACKEND_URL + "/api/mentor/edit-self", {
                    method: "PUT",
                    headers: {
                        Authorization: "Bearer " + token,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(mentor),
                }
                );
                if (response.ok) {
                    const responseBody = await response.json();
                    setStore({ ...getStore(), mentor: responseBody })
                    console.log("Mentor information updated successfully");
                    return true;
                } else {
                    console.error("Failed to update mentor information");
                    return false;
                }
            },

            addMentorImage: async (images, positionX, positionY, scale) => {

                let formData = new FormData();
                console.log(">>> 🍎 images:", images);
                console.log(">>> 🍎 images:", images.images);
                // formData.append("file", images[0]);
                for (let i = 0; i < images.length; i++) {
                    formData.append("file", images[i]);
                }

                formData.append("position_x", positionX);
                formData.append("position_y", positionY);
                formData.append("scale", scale);

                const response = await fetch(process.env.BACKEND_URL + "/api/mentor/upload-photo", {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + sessionStorage.getItem("token")
                    },
                    body: formData
                })

                if (response.status !== 200) return false;
                const responseBody = await response.json();
                console.log("response body:", responseBody);
                return true;
            },

            addPortfolioImages: async (images) => {

                let formData = new FormData();
                console.log(">>> 🍎 images:", images);

                for (let i = 0; i < images.length; i++) {
                    formData.append("file", images[i]);
                }


                const response = await fetch(process.env.BACKEND_URL + "/api/mentor/upload-portfolio-image", {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer " + sessionStorage.getItem("token")
                    },
                    body: formData
                })
                if (response.status !== 200) return false;
                const responseBody = await response.json();
                console.log(responseBody)
                console.log("This is the Response Body")
                return true;
            },

            deletePortfolioImages: async (indices) => {
                try {
                    const response = await fetch(process.env.BACKEND_URL + "/api/mentor/delete-portfolio-images", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: "Bearer " + sessionStorage.getItem("token")
                        },
                        body: JSON.stringify({ indices })
                    });
                    return response.ok;
                } catch (error) {
                    console.error("Error deleting portfolio images:", error);
                    return false;
                }
            },

            deleteProfilePhoto: async () => {
                try {
                    const resp = await fetch(process.env.BACKEND_URL + "/api/mentor/delete-photo", {
                        method: 'DELETE',
                        headers: {
                            Authorization: "Bearer " + sessionStorage.getItem("token")
                        }
                    });
                    return resp.ok;
                } catch (error) {
                    console.error('Error deleting profile photo:', error);
                    return false;
                }
            },

            logOut: () => {
                setStore({
                    token: undefined,
                    customerId: undefined,
                    mentorId: undefined,
                    isMentorLoggedIn: false,
                    isCustomerLoggedIn: false,
                    currentUserData: null
                });

                sessionStorage.clear();
                console.log("Logged out. Token should be undefined:", getStore().token === undefined);
            },

            signUpCustomer: async (customer) => {
                try {
                    const response = await fetch(
                        process.env.BACKEND_URL + "/api/customer/signup", {
                        method: "POST",
                        body: JSON.stringify({
                            first_name: customer.first_name,
                            last_name: customer.last_name,
                            phone: customer.phone,
                            email: customer.email.toLowerCase(),
                            password: customer.password
                        }),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    });
                    const responseBody = await response.json();

                    if (response.status == 201) {
                        return {
                            success: true,
                            message: responseBody.msg || "Account successfully created! Please log in."
                        };
                    } else {
                        return {
                            success: false,
                            message: responseBody.msg || "An error occurred during signup"
                        };
                    }
                } catch (error) {
                    console.error("Signup error:", error);
                    return {
                        success: false,
                        message: "An unexpected error occurred. Please try again later."
                    }
                }
            },

            logInCustomer: async (customer) => {
                try {
                    const response = await fetch(process.env.BACKEND_URL + "/api/customer/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: customer.email.toLowerCase(),
                            password: customer.password
                        })
                    });
                    const data = await response.json();

                    if (!response.ok) {
                        return { success: false, message: data.msg || "Login failed" };
                    }

                    // Clean up any modal artifacts before setting store state
                    const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                    while (modalBackdrops.length > 0) {
                        modalBackdrops[0].remove();
                    }
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';

                    // Clear any existing modals from the DOM
                    const modals = document.getElementsByClassName('modal');
                    Array.from(modals).forEach(modal => {
                        modal.style.display = 'none';
                        modal.classList.remove('show');
                        modal.setAttribute('aria-hidden', 'true');
                        modal.removeAttribute('aria-modal');
                    });

                    setStore({
                        isCustomerLoggedIn: true,
                        customerId: data.customer_id,
                        token: data.access_token,
                        currentUserData: data.customer_data,
                    });
                    sessionStorage.setItem("token", data.access_token);
                    sessionStorage.setItem("isCustomerLoggedIn", "true");
                    sessionStorage.setItem("customerId", data.customer_id);
                    sessionStorage.setItem("currentUserData", JSON.stringify(data.customer_data));
                    return { success: true };
                } catch (error) {
                    console.error("Login error:", error);
                    return { success: false, message: "An unexpected error occurred." };
                }
            },

            editCustomer: async (customer) => {
                const token = getStore().token;
                if (!token) {
                    console.error("No token available for editing customer.");
                    return false;
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/customer/edit-self`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(customer)
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to update customer with status: ${response.status}`);
                    }
                    const data = await response.json();
                    setStore({ currentUserData: data.customer }); // Assuming API returns the updated customer
                    return true;
                } catch (error) {
                    console.error("Error in editCustomer:", error);
                    return false;
                }
            },

            verifyCustomer: ({ access_token, customer_id, ...args }) => {
                setStore({
                    token: access_token,
                    customerId: customer_id
                });
                sessionStorage.setItem("token", access_token);
                sessionStorage.setItem("customerId", customer_id);
            },

            createSession: async (session) => {
                try {
                    const response = await fetch(
                        process.env.BACKEND_URL + "/api/session/create", {
                        method: "POST",
                        body: JSON.stringify({
                            customer_id: session.customer_id,
                            title: session.title,
                            description: session.description,
                            is_active: session.is_active,
                            schedule: session.schedule,
                            focus_areas: session.focus_areas,
                            skills: session.skills,
                            resourceLink: session.resourceLink,
                            duration: session.duration,
                            totalHours: session.totalHours,
                        }),
                        headers: {
                            "Content-Type": "application/json"
                        }
                    }
                    );

                    if (response.status !== 201) {
                        throw new Error("Failed to create session");
                    }

                    const responseBody = await response.json();
                    console.log("Session creation response:", responseBody);

                    // Return the actual response data instead of just true
                    return responseBody;
                } catch (error) {
                    console.error("Error creating session:", error);
                    throw error;
                }
            },

            editSession: async (sessionId, updatedSession, token) => {
                try {
                    const response = await fetch(
                        process.env.BACKEND_URL + `/api/session/edit/${sessionId}`,
                        {
                            method: "PUT",
                            body: JSON.stringify({
                                title: updatedSession.title,
                                description: updatedSession.description,
                                is_active: updatedSession.is_active,
                                schedule: updatedSession.schedule,
                                focus_areas: updatedSession.focus_areas,
                                skills: updatedSession.skills,
                                resourceLink: updatedSession.resourceLink,
                                duration: updatedSession.duration,
                                totalHours: updatedSession.totalHours,
                            }),
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const responseBody = await response.json();
                    console.log(responseBody);

                    return true;
                } catch (error) {
                    console.error("Error in editSession:", error);
                    return false;
                }
            },

            getAllSessionRequests: async () => {
                const store = getStore();
                const token = sessionStorage.getItem("token");

                if (!token) {
                    console.error("No token found in sessionStorage");
                    return false;
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/sessions`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setStore({ ...store, sessionRequests: data });
                        return true;
                    } else {
                        console.error("Failed to fetch sessions with status:", response.status);
                        return false;
                    }
                } catch (error) {
                    console.error("Error fetching sessions:", error);
                    return false;
                }
            },

            deleteSessionById: async (sessionId) => {
                const token = sessionStorage.getItem("token")
                let options = {
                    method: "DELETE",
                    headers: {
                        Authorization: "Bearer " + token
                    }
                }
                let response = await fetch(process.env.BACKEND_URL + "/api/session/delete/" + sessionId, options)
                if (response.status === 200) {
                    let data = await response.json()
                    console.log(data)
                    return true
                } else {
                    alert("Delete Unsuccessful")
                    return false
                }
            },

            getSessionById: async (sessionId) => {
                const token = sessionStorage.getItem("token"); // Retrieve the token
                if (!token) {
                    console.error("No token found. Please log in.");
                    return null;
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/session/${sessionId}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`, // Include the token in the Authorization header
                        },
                    });

                    if (!response.ok) throw new Error(`Failed to fetch session. Status: ${response.status}`);

                    const data = await response.json();
                    setStore({ selectedSession: data }); // Save the fetched data in the global store
                    console.log("Session data retrieved successfully:", data);
                    return data;
                } catch (error) {
                    console.error("Error fetching session data:", error);
                }
            },

            getCustomerSessions: async () => {
                const store = getStore();
                const token = sessionStorage.getItem('token');

                if (!token) {
                    console.error("No token found in sessionStorage");
                    return;
                }

                const response = await fetch(
                    process.env.BACKEND_URL + "/api/sessions/customer-sessions", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + sessionStorage.getItem('token')
                    }
                }
                )
                if (response.ok) {
                    const sessions = await response.json();
                    console.log("Customer sessions:", sessions);
                    setStore({ ...store, customerSessions: sessions })
                    return true;
                } else {
                    console.error("Failed to fetch customer sessions with status:", response.status);
                }
            },

            confirmMentorForSession: async (sessionId, mentorId, startTime, endTime) => {
                try {
                    const store = getStore();
                    const token = sessionStorage.getItem("token");

                    if (!token) {
                        console.error("No token found, user must be logged in");
                        return false;
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/session/${sessionId}/confirm-mentor/${mentorId}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({ start_time: startTime, end_time: endTime })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log("Mentor confirmed for session:", data);

                        // Update the relevant store properties
                        const updatedSessions = store.customerSessions.map(session =>
                            session.id === sessionId ? data.session : session
                        );

                        setStore({
                            customerSessions: updatedSessions
                        });

                        return true;
                    } else {
                        console.error("Failed to confirm mentor with status:", response.status);
                        const errorData = await response.json();
                        console.error("Error details:", errorData);
                        return false;
                    }
                } catch (error) {
                    console.error("Error confirming mentor for session:", error);
                    return false;
                }
            },

            addMeetingToAppointment: async (sessionId, appointmentIndex, meetingUrl) => {
                try {
                    const store = getStore();
                    const token = sessionStorage.getItem("token");

                    if (!token) {
                        console.error("No token found, user must be logged in");
                        return false;
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/session/${sessionId}/appointment/meeting`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            appointment_index: appointmentIndex,
                            meetingUrl: meetingUrl
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log("Meeting URL added to appointment:", data);

                        // Update the relevant store properties if needed
                        // This might involve updating customerSessions or other state
                        const updatedSessions = store.customerSessions.map(session => {
                            if (session.id === sessionId) {
                                // Create a new session object with updated appointments
                                return {
                                    ...session,
                                    appointments: session.appointments.map((appointment, index) =>
                                        index === appointmentIndex
                                            ? { ...appointment, meetingUrl: meetingUrl }
                                            : appointment
                                    )
                                };
                            }
                            return session;
                        });

                        setStore({
                            customerSessions: updatedSessions
                        });

                        return data;
                    } else {
                        console.error("Failed to add meeting URL with status:", response.status);
                        const errorData = await response.json();
                        console.error("Error details:", errorData);
                        return false;
                    }
                } catch (error) {
                    console.error("Error adding meeting URL to appointment:", error);
                    return false;
                }
            },

            addSessionPaidAndAmount: async (sessionId, updatedSession, token) => {
                const response = await fetch(
                    process.env.BACKEND_URL + `/api/session/${sessionId}/payment-track`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            paid_amount: updatedSession.paid_amount,
                            is_paid: updatedSession.is_paid,
                        }),
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    }
                );
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const responseBody = await response.json();
                console.log(responseBody);

                return true;

            },

            completeSessionMentor: async (sessionId, is_completed, completed_mentor_notes, completed_mentor_status) => {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    console.error("No token found in sessionStorage");
                    return false;
                }
                console.log("Session ID:", sessionId, typeof sessionId);

                const response = await fetch(`${process.env.BACKEND_URL}/api/session-complete-mentor${sessionId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        is_completed: is_completed,
                        completed_mentor_notes: completed_mentor_notes,
                        completed_mentor_status: completed_mentor_status
                    })
                });
                const responseBody = await response.json();
                console.log("Session creation response:", responseBody);

                // Return the actual response data instead of just true
                return responseBody;
            },

            completeSessionCustomer: async (sessionId, is_flagged, completed_customer_notes, completed_customer_status, star_rating) => {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    console.error("No token found in sessionStorage");
                    return false;
                }
                console.log("Session ID:", sessionId, typeof sessionId);

                const response = await fetch(`${process.env.BACKEND_URL}/api/session-complete-customer${sessionId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        is_flagged: is_flagged,
                        completed_customer_notes: completed_customer_notes,
                        completed_customer_status: completed_customer_status,
                        star_rating: star_rating
                    })
                });
                const responseBody = await response.json();
                console.log("Session creation response:", responseBody);

                // Return the actual response data instead of just true
                return responseBody;
            },

            sendMessageMentor: async (sessionId, text) => {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    console.error("No token found in sessionStorage");
                    return false;
                }

                const response = await fetch(`${process.env.BACKEND_URL}/api/message-mentor`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        text: text,
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("Message sent successfully:", data);

                    return true;
                } else {
                    console.error("Failed to send message with status:", response.status);
                    return false;
                }
            },
            sendMessageCustomer: async (sessionId, text, mentorId) => {
                const token = sessionStorage.getItem("token");
                if (!token) {
                    console.error("No token found in sessionStorage");
                    return false;
                }

                const response = await fetch(`${process.env.BACKEND_URL}/api/message-customer`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        text: text,
                        mentor_id: mentorId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("Message sent successfully:", data);
                    return true;
                } else {
                    console.error("Failed to send message with status:", response.status);
                    return false;
                }
            },

            trackMentorBooking: async (bookingData) => {
                try {
                    const token = sessionStorage.getItem("token");
                    if (!token) {
                        console.error("No token found in sessionStorage");
                        return { success: false, message: "Authentication required.", data: null };
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/track-booking`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(bookingData)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        // console.log("Booking tracked successfully:", data); // Keep concise log or remove if too verbose
                        return { success: true, message: "Booking tracked successfully", data: data };
                    } else {
                        console.error("Failed to track booking with status:", response.status, "Response:", data);
                        return { success: false, message: data.message || data.msg || "Failed to track booking", data: data };
                    }
                } catch (error) {
                    console.error("Error tracking booking:", error);
                    return { success: false, message: "Network error during booking tracking.", data: null };
                }
            },
            updateBookingWithCalendlyDetails: async (bookingId, calendlyDetails) => {
                try {
                    const token = sessionStorage.getItem("token");
                    if (!token) {
                        console.error("No token found in sessionStorage");
                        return { success: false, message: "Please log in to update your booking" };
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/bookings/${bookingId}/calendly-details`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(calendlyDetails)
                    });

                    if (response.status === 401) {
                        getActions().logOut();
                        alert("Your login token has expired. Please log in again to continue.");
                        return { success: false, message: "Session expired. Please log in again." };
                    }

                    const data = await response.json();

                    if (response.ok) {
                        // console.log("Booking updated with Calendly details successfully:", data); // Keep concise or remove
                        return { success: true, ...data };
                    } else {
                        console.error("Failed to update booking with Calendly details:", data);
                        return { success: false, message: data.msg || data.message || "Failed to update booking" };
                    }

                } catch (error) {
                    console.error("Error in updateBookingWithCalendlyDetails:", error);
                    return { success: false, message: "Network error occurred while updating booking" };
                }
            },

            fetchCalendlyDetailsAndUpdateBooking: async (bookingId, eventUri, inviteeUri, mentorId) => {
                try {
                    const token = sessionStorage.getItem("token");
                    if (!token) {
                        console.error("No token found for fetchCalendlyDetailsAndUpdateBooking");
                        return { success: false, message: "Authentication required." };
                    }

                    // FIXED: Use the correct endpoint that exists in your routes.py
                    const response = await fetch(`${process.env.BACKEND_URL}/api/sync_booking_with_calendly_details`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            bookingId: bookingId,
                            calendlyEventUri: eventUri,
                            calendlyInviteeUri: inviteeUri,
                            mentorId: mentorId
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return { success: true, ...data };
                    } else {
                        console.error("Failed to sync Calendly details:", data);
                        return { success: false, message: data.message || "Failed to sync Calendly details" };
                    }
                } catch (error) {
                    console.error("Error in fetchCalendlyDetailsAndUpdateBooking:", error);
                    return { success: false, message: "Network error occurred while fetching booking details" };
                }
            },

            finalizeBooking: async (bookingData) => {
                try {
                    const token = sessionStorage.getItem("token");
                    if (!token) {
                        console.error("No token found in sessionStorage");
                        return { success: false, message: "Please log in to finalize your booking" };
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/finalize-booking`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(bookingData)
                    });

                    if (response.status === 401) {
                        getActions().logOut();
                        alert("Your login token has expired. Please log in again to continue.");
                        return { success: false, message: "Session expired. Please log in again." };
                    }

                    const data = await response.json();

                    if (response.ok) {
                        // Refresh user data to ensure booking lists are up-to-date
                        await getActions().getCurrentUser();
                        return {
                            success: true,
                            booking: data.booking,
                            message: data.message
                        };
                    } else {
                        return { success: false, message: data.msg || "Failed to finalize booking" };
                    }

                } catch (error) {
                    console.error("Error in finalizeBooking:", error);
                    return { success: false, message: "Network error occurred while finalizing booking" };
                }
            },
            getBookingDetails: async (bookingId) => {
                const store = getStore();
                try {
                    const token = sessionStorage.getItem("token");
                    if (!token) {
                        console.error("No token found for getBookingDetails");
                        return { success: false, message: "Authentication required." };
                    }

                    const response = await fetch(`${process.env.BACKEND_URL}/api/bookings/${bookingId}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // console.log("Successfully fetched booking details:", data.booking); // Keep concise or remove
                        return { success: true, booking: data.booking };
                    } else {
                        console.error("Failed to fetch booking details:", data.message || response.statusText);
                        return { success: false, message: data.message || "Failed to fetch booking details" };
                    }
                } catch (error) {
                    console.error("Network error fetching booking details:", error);
                    return { success: false, message: "Network error occurred while fetching booking details" };
                }
            },
            getMentorBookings: async () => {
                const store = getStore();
                const token = store.token;
                if (!token) {
                    console.error("No token available for fetching mentor bookings.");
                    return [];
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/bookings`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch mentor bookings with status: ${response.status}`);
                    }
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.error("Error in getMentorBookings:", error);
                    return []; // Return empty array on error
                }
            },

            getCustomerBookings: async () => {
                const store = getStore();
                const token = store.token;
                if (!token) {
                    console.error("No token available for fetching customer bookings.");
                    return [];
                }

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/customer/bookings`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch customer bookings with status: ${response.status}`);
                    }
                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.error("Error in getCustomerBookings:", error);
                    return []; // Return empty array on error
                }
            },

            verifyCode: async (email, code) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/verify-code`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email: email, code: code })
                    });
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.msg || "Code verification failed");
                    }
                    return { success: true, message: data.msg };
                } catch (error) {
                    console.error("Error verifying code:", error);
                    return { success: false, error: error.message };
                }
            },

            syncBookingDetails: async (bookingData) => {
                const store = getStore();
                const token = sessionStorage.getItem("access_token");
                if (!token) return { success: false, error: "No access token found" };

                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/booking/calendly-sync`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(bookingData)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Refresh the user's data to get the updated booking list
                        await getActions().getCurrentUser();
                        return { success: true, booking: data.booking };
                    } else {
                        const error = await response.json();
                        return { success: false, error: error.message || "Failed to sync booking details" };
                    }
                } catch (error) {
                    console.error("Error syncing booking details:", error);
                    return { success: false, error: error.message };
                }
            },

            initiateGoogleAuth: async (userType) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/google/initiate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_type: userType
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return {
                            success: true,
                            auth_url: data.auth_url
                        };
                    } else {
                        return {
                            success: false,
                            message: data.error || "Failed to initiate Google authentication"
                        };
                    }
                } catch (error) {
                    console.error("Error initiating Google auth:", error);
                    return {
                        success: false,
                        message: "Network error occurred while initiating Google authentication"
                    };
                }
            },

            verifyGoogleAuth: async (authData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/google/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Store user data in session storage and update store
                        const userType = data.role;
                        const userData = data[`${userType}_data`];
                        const userId = data[`${userType}_id`];

                        // Clean up any modal artifacts
                        const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                        while (modalBackdrops.length > 0) {
                            modalBackdrops[0].remove();
                        }
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';

                        // Clear any existing modals from the DOM
                        const modals = document.getElementsByClassName('modal');
                        Array.from(modals).forEach(modal => {
                            modal.style.display = 'none';
                            modal.classList.remove('show');
                            modal.setAttribute('aria-hidden', 'true');
                            modal.removeAttribute('aria-modal');
                        });

                        // Update store based on user type
                        if (userType === 'mentor') {
                            setStore({
                                token: data.access_token,
                                isMentorLoggedIn: true,
                                mentorId: userId,
                                currentUserData: userData,
                            });
                            sessionStorage.setItem("token", data.access_token);
                            sessionStorage.setItem("isMentorLoggedIn", "true");
                            sessionStorage.setItem("mentorId", userId);
                            sessionStorage.setItem("currentUserData", JSON.stringify(userData));
                        } else {
                            setStore({
                                token: data.access_token,
                                isCustomerLoggedIn: true,
                                customerId: userId,
                                currentUserData: userData,
                            });
                            sessionStorage.setItem("token", data.access_token);
                            sessionStorage.setItem("isCustomerLoggedIn", "true");
                            sessionStorage.setItem("customerId", userId);
                            sessionStorage.setItem("currentUserData", JSON.stringify(userData));
                        }

                        return {
                            success: true,
                            userType: userType,
                            userData: userData
                        };
                    } else {
                        return {
                            success: false,
                            message: data.error || "Authentication verification failed"
                        };
                    }
                } catch (error) {
                    console.error("Error verifying Google auth:", error);
                    return {
                        success: false,
                        message: "Network error occurred during authentication verification"
                    };
                }
            },

            initiateGitHubAuth: async (userType) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/github/initiate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_type: userType
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return {
                            success: true,
                            auth_url: data.auth_url
                        };
                    } else {
                        return {
                            success: false,
                            message: data.error || "Failed to initiate GitHub authentication"
                        };
                    }
                } catch (error) {
                    console.error("Error initiating GitHub auth:", error);
                    return {
                        success: false,
                        message: "Network error occurred while initiating GitHub authentication"
                    };
                }
            },

            verifyGitHubAuth: async (authData) => {
                try {
                    console.log('🔄 Verifying GitHub auth with data:', authData);

                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/github/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();
                    console.log('📊 GitHub auth verification response:', data);

                    if (response.ok && data.success) {
                        // Store user data in session storage and update store
                        const userType = data.role;
                        const userData = data[`${userType}_data`];
                        const userId = data[`${userType}_id`];

                        console.log('✅ GitHub auth verified successfully:', { userType, userId });

                        // Clean up any modal artifacts (same as Google OAuth)
                        const modalBackdrops = document.getElementsByClassName('modal-backdrop');
                        while (modalBackdrops.length > 0) {
                            modalBackdrops[0].remove();
                        }
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';

                        // Clear any existing modals from the DOM
                        const modals = document.getElementsByClassName('modal');
                        Array.from(modals).forEach(modal => {
                            modal.style.display = 'none';
                            modal.classList.remove('show');
                            modal.setAttribute('aria-hidden', 'true');
                            modal.removeAttribute('aria-modal');
                        });

                        // Update store based on user type - EXACTLY like Google OAuth
                        if (userType === 'mentor') {
                            setStore({
                                token: data.access_token,
                                isMentorLoggedIn: true,
                                mentorId: userId,
                                currentUserData: userData,
                            });
                            sessionStorage.setItem("token", data.access_token);
                            sessionStorage.setItem("isMentorLoggedIn", "true");
                            sessionStorage.setItem("mentorId", userId);
                            sessionStorage.setItem("currentUserData", JSON.stringify(userData));

                            console.log('✅ Mentor GitHub auth stored successfully');
                        } else {
                            setStore({
                                token: data.access_token,
                                isCustomerLoggedIn: true,
                                customerId: userId,
                                currentUserData: userData,
                            });
                            sessionStorage.setItem("token", data.access_token);
                            sessionStorage.setItem("isCustomerLoggedIn", "true");
                            sessionStorage.setItem("customerId", userId);
                            sessionStorage.setItem("currentUserData", JSON.stringify(userData));

                            console.log('✅ Customer GitHub auth stored successfully');
                        }

                        // Verify token was stored correctly
                        const storedToken = sessionStorage.getItem("token");
                        console.log('🔍 Token verification after GitHub auth:', {
                            tokenStored: !!storedToken,
                            tokenPreview: storedToken ? storedToken.substring(0, 20) + '...' : 'none'
                        });

                        return {
                            success: true,
                            userType: userType,
                            userData: userData
                        };
                    } else {
                        console.error('❌ GitHub auth verification failed:', data);
                        return {
                            success: false,
                            message: data.error || "GitHub authentication verification failed"
                        };
                    }
                } catch (error) {
                    console.error("❌ Error verifying GitHub auth:", error);
                    return {
                        success: false,
                        message: "Network error occurred during GitHub authentication verification"
                    };
                }
            },


            initiateMVPGoogleAuth: async (mentorId) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/mvp/google/initiate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            mentor_id: mentorId
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return {
                            success: true,
                            auth_url: data.auth_url
                        };
                    } else {
                        console.error('MVP Google OAuth initiation failed:', data);
                        return {
                            success: false,
                            message: data.error || 'Failed to initiate Google authentication'
                        };
                    }
                } catch (error) {
                    console.error('MVP Google OAuth initiation error:', error);
                    return {
                        success: false,
                        message: 'Network error occurred'
                    };
                }
            },

            // MVP Google OAuth - Verify (reuse regular verification)
            verifyMVPGoogleAuth: async (authData) => {
                try {
                    // Since MVP creates customer accounts, we can reuse the regular Google verification
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/google/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Store the token and user data
                        sessionStorage.setItem("token", data.access_token);
                        sessionStorage.setItem("user_role", data.role);

                        setStore({
                            token: data.access_token,
                            user: data.customer_data,
                            userRole: data.role,
                            isLoggedIn: true
                        });

                        return {
                            success: true,
                            user_data: data.customer_data,
                            role: data.role,
                            message: 'Authentication successful'
                        };
                    } else {
                        console.error('MVP Google auth verification failed:', data);
                        return {
                            success: false,
                            message: data.error || 'Authentication verification failed'
                        };
                    }
                } catch (error) {
                    console.error('MVP Google auth verification error:', error);
                    return {
                        success: false,
                        message: 'Network error occurred during verification'
                    };
                }
            },

            initiateMVPGitHubAuth: async (mentorId) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/mvp/github/initiate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            mentor_id: mentorId
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        return {
                            success: true,
                            auth_url: data.auth_url
                        };
                    } else {
                        return {
                            success: false,
                            message: data.error || "Failed to initiate GitHub authentication"
                        };
                    }
                } catch (error) {
                    console.error("Error initiating MVP GitHub auth:", error);
                    return {
                        success: false,
                        message: "Network error occurred while initiating GitHub authentication"
                    };
                }
            },

            verifyMVPGitHubAuth: async (authData) => {
                try {
                    // Use the same verification endpoint as regular GitHub OAuth since JWT verification is the same
                    const response = await fetch(`${process.env.BACKEND_URL}/api/auth/github/verify`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(authData)
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        // Store user data in session storage and update store (same as regular OAuth)
                        const userType = data.role;
                        const userData = data[`${userType}_data`];
                        const userId = data[`${userType}_id`];

                        // Update store for customer
                        setStore({
                            token: data.access_token,
                            isCustomerLoggedIn: true,
                            customerId: userId,
                            currentUserData: userData,
                        });
                        sessionStorage.setItem("token", data.access_token);
                        sessionStorage.setItem("isCustomerLoggedIn", "true");
                        sessionStorage.setItem("customerId", userId);
                        sessionStorage.setItem("currentUserData", JSON.stringify(userData));

                        return {
                            success: true,
                            userType: userType,
                            userData: userData
                        };
                    } else {
                        return {
                            success: false,
                            message: data.error || "GitHub authentication verification failed"
                        };
                    }
                } catch (error) {
                    console.error("Error verifying MVP GitHub auth:", error);
                    return {
                        success: false,
                        message: "Network error occurred during GitHub authentication verification"
                    };
                }
            },

            getMentorAvailability: async () => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/availability`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${getStore().token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            success: true,
                            availabilities: data.availabilities,
                            settings: data.settings
                        };
                    } else {
                        console.error("Failed to fetch mentor availability");
                        return { success: false, message: "Failed to fetch availability" };
                    }
                } catch (error) {
                    console.error("Error fetching mentor availability:", error);
                    return { success: false, message: "Network error" };
                }
            },

            setMentorAvailability: async (availabilityData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/availability`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${getStore().token}`
                        },
                        body: JSON.stringify(availabilityData)
                    });

                    if (response.ok) {
                        return { success: true, message: "Availability updated successfully" };
                    } else {
                        return { success: false, message: "Failed to update availability" };
                    }
                } catch (error) {
                    console.error("Error updating mentor availability:", error);
                    return { success: false, message: "Network error" };
                }
            },

            getMentorUnavailability: async () => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/unavailability`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${getStore().token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            success: true,
                            unavailabilities: data.unavailabilities || []
                        };
                    } else {
                        return { success: false, message: "Failed to fetch unavailability" };
                    }
                } catch (error) {
                    console.error("Error fetching unavailability:", error);
                    return { success: false, message: "Network error" };
                }
            },

            addMentorUnavailability: async (unavailabilityData) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/unavailability`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${getStore().token}`
                        },
                        body: JSON.stringify(unavailabilityData)
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return { success: true, message: "Unavailability added", id: data.id };
                    } else {
                        return { success: false, message: "Failed to add unavailability" };
                    }
                } catch (error) {
                    console.error("Error adding unavailability:", error);
                    return { success: false, message: "Network error" };
                }
            },

            removeMentorUnavailability: async (unavailabilityId) => {
                try {
                    const response = await fetch(`${process.env.BACKEND_URL}/api/mentor/unavailability/${unavailabilityId}`, {
                        method: "DELETE",
                        headers: {
                            "Authorization": `Bearer ${getStore().token}`
                        }
                    });

                    if (response.ok) {
                        return { success: true, message: "Unavailability removed" };
                    } else {
                        return { success: false, message: "Failed to remove unavailability" };
                    }
                } catch (error) {
                    console.error("Error removing unavailability:", error);
                    return { success: false, message: "Network error" };
                }
            },

            getMentorAvailableSlots: async (mentorId, startDate, endDate) => {
                try {
                    const params = new URLSearchParams();
                    if (startDate) params.append('start_date', startDate);
                    if (endDate) params.append('end_date', endDate);

                    const response = await fetch(
                        `${process.env.BACKEND_URL}/api/mentor/${mentorId}/available-slots?${params}`,
                        {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json"
                            }
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        return {
                            success: true,
                            slots: data.available_slots,
                            timezone: data.timezone
                        };
                    } else {
                        return { success: false, message: "Failed to fetch available slots" };
                    }
                } catch (error) {
                    console.error("Error fetching available slots:", error);
                    return { success: false, message: "Network error" };
                }
            },

            createMeetingForBooking: async (bookingId) => {
                try {
                    const token = sessionStorage.getItem("token");
                    const response = await fetch(`${process.env.BACKEND_URL}/api/booking/${bookingId}/create-meeting`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return { success: true, ...data };
                    } else {
                        const error = await response.json();
                        return { success: false, error: error.msg };
                    }
                } catch (error) {
                    console.error("Error creating meeting:", error);
                    return { success: false, error: "Network error" };
                }
            },

            // Add these actions to your existing flux.js file

            // In the actions object, add these new methods:

            refreshMeetingToken: async (meetingId) => {
                try {
                    const store = getStore();
                    const response = await fetch(`${process.env.BACKEND_URL}/api/videosdk/refresh-token/${meetingId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + store.token
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to refresh meeting token');
                    }

                    const data = await response.json();

                    if (data.success) {
                        return {
                            success: true,
                            token: data.token,
                            expiryHours: data.tokenExpiryHours
                        };
                    } else {
                        throw new Error(data.msg || 'Token refresh failed');
                    }
                } catch (error) {
                    console.error('Error refreshing meeting token:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },

            getMeetingStatus: async (meetingId) => {
                try {
                    const store = getStore();
                    const response = await fetch(`${process.env.BACKEND_URL}/api/videosdk/meeting-status/${meetingId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + store.token
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to get meeting status');
                    }

                    const data = await response.json();

                    if (data.success) {
                        return {
                            success: true,
                            status: data.status,
                            details: data.details
                        };
                    } else {
                        throw new Error(data.msg || 'Failed to get meeting status');
                    }
                } catch (error) {
                    console.error('Error getting meeting status:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },

            endMeeting: async (meetingId) => {
                try {
                    const store = getStore();
                    const response = await fetch(`${process.env.BACKEND_URL}/api/videosdk/end-meeting/${meetingId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + store.token
                        }
                    });

                    if (!response.ok) {
                        throw new Error('Failed to end meeting');
                    }

                    const data = await response.json();

                    if (data.success) {
                        return {
                            success: true,
                            message: data.msg
                        };
                    } else {
                        throw new Error(data.msg || 'Failed to end meeting');
                    }
                } catch (error) {
                    console.error('Error ending meeting:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },

            // Enhanced getMeetingToken with better error handling
            getMeetingToken: async (meetingId) => {
                try {
                    const store = getStore();
                    const response = await fetch(`${process.env.BACKEND_URL}/api/videosdk/meeting-token/${meetingId}`, {
                        headers: {
                            'Authorization': 'Bearer ' + store.token
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.msg || 'Failed to get meeting token');
                    }

                    const data = await response.json();

                    if (data.success) {
                        return {
                            success: true,
                            token: data.token,
                            userName: data.userName,
                            isModerator: data.isModerator,
                            tokenExpiryHours: data.tokenExpiryHours
                        };
                    } else {
                        throw new Error('Invalid response from server');
                    }
                } catch (error) {
                    console.error('Error getting meeting token:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            }





        }
    };
};

export default getState;


