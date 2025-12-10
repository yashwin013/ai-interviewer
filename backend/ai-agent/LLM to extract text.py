
# LLM to extract text


f1 = {
  "message": "Resume uploaded and text extracted successfully.",
  "resumeProfile": {
    "extracted_text": "Yashwin Verma yashwinverma13@gmail.com | +91 6392256489 | linkedin.com/YashwinVerma | github.com/yashwin013 Professional Summary A Computer Science graduate specializing in AI/ML and backend development. Proficient in building scalable APIs with the MERN stack and developing high-accuracy deep learning models for tasks like computer vision and data analysis. Skilled in Python and Java, I am eager to contribute to a challenging backend or AI/ML role where I can build innovative and efficient solutions. Education Vellore Institute of Technology Sep 2021 – May 2025 Bachelor of Technology in Computer Science Delhi Public School, Kalyanpur Jun 2021 Intermediate (CBSE) Experience Full Stack Developer Intern, Hapticware Jan 2025 – Apr 2025 • Designed and maintained scalable backend services for a financial document analysis platform using the MERN stack, enabling automated processing of 200+ quarterly reports weekly. • Engineered secure RESTful APIs and optimized MongoDB integration, boosting data retrieval speed and system reliability by 35%. • Collaborated with AI teams to integrate LLM-based analytics into the frontend, reducing response latency by 40% and enhancing the platform experience for users. Web Development Intern, GetCurious (formerly UserStudy) – Bengaluru, India Sep 2023 – Nov 2023 • Built dynamic and responsive applications using React, Angular and Django, reducing development time by 15%. • Collaborated with team streamlining code management with Git and reducing integration issues by 30%. Projects Real-Time Messaging Application using MERN & Socket.io • Designed to enable secure, low-latency real-time communication between users. • Developed a full-stack chat platform using MERN stack, Socket.io, and TailwindCSS with JWT-based authentication, CI/CD deployment, and Cloudinary integration for image storage. • Improved API response times by 35%, reduced message delivery latency, and achieved 99.9% uptime with seamless real-time updates. Brain Tumor Detection using Convolutional Neural Networks • Aimed to automate brain tumor classification from MRI scans using deep learning. • Built and trained a CNN model with TensorFlow, integrating data preprocessing pipelines (normalization, resizing, and augmentation) and performing hyperparameter tuning for accuracy optimization. • Achieved 97% classification accuracy and improved training efficiency by 15%, ensuring more robust feature extraction and prediction reliability. Underwater Microplastic Pollution Hotspot Management • Developed to detect underwater plastic pollution and predict microplastic density for targeted cleanup operations. • Devised a YOLOv8-based object detection model trained on underwater datasets and integrated NOAA environmental data (temperature, salinity, currents) to estimate microplastic spread. Built an AI-driven density estimation system for mapping hotspots. • Reached 92.5% detection accuracy, improved pollution mapping precision by 23%, and optimized cleanup resource allocation by 47%, supporting sustainable ocean management. Skills Languages: Java, Python, C, C++, DBMS , JavaScript, HTML/CSS Frameworks: MERN, Flask, WordPress, TensorFlow, Keras, Socket.io, TailwindCSS, Mongoose, Generative AI, LLM, Spring Boot, Angular Developer Tools: Git, AWS , Google Cloud Platform, Microsoft Azure, MongoDB, Cloudinary, Postman, Jerkins, CI/CD pipeline, Veracode",
    "chunks": [
      "Yashwin Verma yashwinverma13@gmail.com | +91 6392256489 | linkedin.com/YashwinVerma | github.com/yashwin013 Professional Summary A Computer Science graduate specializing in AI/ML and backend development. Proficient in building scalable APIs with the MERN stack and developing high-accuracy deep learning models for tasks like computer vision and data analysis. Skilled in Python and Java, I am eager to contribute to a challenging backend or AI/ML role where I can build innovative and efficient solutions. Education Vellore Institute of Technology Sep 2021 – May 2025 Bachelor of Technology in Computer Science Delhi Public School, Kalyanpur Jun 2021 Intermediate (CBSE) Experience Full Stack Developer Intern, Hapticware Jan 2025 – Apr 2025 • Designed and maintained scalable backend services for a",
      "Intern, Hapticware Jan 2025  Apr 2025 • Designed and maintained scalable backend services for a financial document analysis platform using the MERN stack, enabling automated processing of 200+ quarterly reports weekly. • Engineered secure RESTful APIs and optimized MongoDB integration, boosting data retrieval speed and system reliability by 35%. • Collaborated with AI teams to integrate LLM-based analytics into the frontend, reducing response latency by 40% and enhancing the platform experience for users. Web Development Intern, GetCurious (formerly UserStudy) – Bengaluru, India Sep 2023 – Nov 2023 • Built dynamic and responsive applications using React, Angular and Django, reducing development time by 15%. • Collaborated with team streamlining code management with Git and reducing",
      "time by 15%. • Collaborated with team streamlining code management with Git and reducing integration issues by 30%. Projects Real-Time Messaging Application using MERN & Socket.io • Designed to enable secure, low-latency real-time communication between users. • Developed a full-stack chat platform using MERN stack, Socket.io, and TailwindCSS with JWT-based authentication, CI/CD deployment, and Cloudinary integration for image storage. • Improved API response times by 35%, reduced message delivery latency, and achieved 99.9% uptime with seamless real-time updates. Brain Tumor Detection using Convolutional Neural Networks • Aimed to automate brain tumor classification from MRI scans using deep learning. • Built and trained a CNN model with TensorFlow, integrating data preprocessing",
      "deep learning. • Built and trained a CNN model with TensorFlow, integrating data preprocessing pipelines (normalization, resizing, and augmentation) and performing hyperparameter tuning for accuracy optimization. • Achieved 97% classification accuracy and improved training efficiency by 15%, ensuring more robust feature extraction and prediction reliability. Underwater Microplastic Pollution Hotspot Management • Developed to detect underwater plastic pollution and predict microplastic density for targeted cleanup operations. • Devised a YOLOv8-based object detection model trained on underwater datasets and integrated NOAA environmental data (temperature, salinity, currents) to estimate microplastic spread. Built an AI-driven density estimation system for mapping hotspots. • Reached 92.5%",
      "spread. Built an AI-driven density estimation system for mapping hotspots. • Reached 92.5% detection accuracy, improved pollution mapping precision by 23%, and optimized cleanup resource allocation by 47%, supporting sustainable ocean management. Skills Languages: Java, Python, C, C++, DBMS , JavaScript, HTML/CSS Frameworks: MERN, Flask, WordPress, TensorFlow, Keras, Socket.io, TailwindCSS, Mongoose, Generative AI, LLM, Spring Boot, Angular Developer Tools: Git, AWS , Google Cloud Platform, Microsoft Azure, MongoDB, Cloudinary, Postman, Jerkins, CI/CD pipeline, Veracode"
    ],
    "file_path": "C:\\Users\\Yashwin\\Documents\\Projects\\AI-Powered Mock Interviewer\\backend\\uploads\\resumes\\e288368d-94f8-456b-bc62-21b3e82c97b8.pdf"
  }
    }
<<<<<<< HEAD
# Readable pdf => check
=======

>>>>>>> ac34ecb8c408d76a300d6a884b6ad3c131614131
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing import Optional

class ResumeProfileExtraction(BaseModel):
    name: Optional[str] = Field(description = "Name of the candidate.")
    phone: Optional[str] = Field(description = "Phone number of the candidate.")
    linkedin: Optional[str] = Field(description = "LinkedIn Profile of the candidate.")
    github: Optional[str] = Field(description = "GitHub link of the candidate.")
    skills: Optional[list[str]] = Field(description = "Skills of the candidate.")
    experience: Optional[str] = Field(description = "Candidate's work experience.")

llm = ChatOpenAI(model = "gpt-3.5-turbo")
response = llm.with_structured_output(ResumeProfileExtraction)

def extract_fields_llm(text: str) -> ResumeProfileExtraction:
    prompt = f"""
                Extract the following fields from the object(s) you receive : 
                
                - Full name
                - Phone Number
                - LinkedIn
                - GitHub
                - Skills
                - Experience

                Text:
                {text}
               """

    return response.invoke(prompt)

fields = extract_fields_llm(f1["resumeProfile"])
print(fields.model_dump())
