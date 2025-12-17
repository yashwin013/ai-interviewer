import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Any
       
class Job_Matcher:
    
    def __init__(self, embeddings):
        self.embeddings = embeddings

    def build_resume_text(self, profile: dict) -> str: # Returning skills and experience(Crucial for skill based job matching)
        skills = ", ".join(profile.get("skills", []))
        exp = profile.get("experience", "")
        return f"Skills: {skills}\nExperience: {exp}"

    def embedding_match(self, resume_text: str, jd_text: str) -> Any:
        vecs = self.embeddings.embed_documents([resume_text,jd_text])
        score = cosine_similarity([vecs[0]],[vecs[1]])[0][0] # Comparing resume_text with jd_text and seeing how similar they are
        return round(score * 100, 2)
    
    def skill_overlap(self, resume_skills, jd_skills):
        # Storing resume and JD skills in separate sets
        rs = {s.lower() for s in resume_skills} # All Resume Skills
        js = {s1.lower() for s1 in jd_skills} # All JD listed skills
        matched = rs & js # Intersection of both will give common skills
        missing = js - rs # Subtraction of both will give the skills exclusive to jd only
        score = (len(matched) / max(len(js),1)) * 100
        return score, matched, missing

    def match(self, profile, jd_text, jd_skills):
        resume_text = self.build_resume_text(profile)
        emb_score = self.embedding_match(resume_text,jd_text) # Checking similarity for resume and jd
        skill_score, matched, missing = self.skill_overlap(profile["skills"], jd_skills) 

        final_score = round((0.65 * emb_score) + (0.35 * skill_score), 2) # Giving 65% to Embedding score and 35% to Similarity Score

        return {
            "Similarity_Score":skill_score,
            "Embedding_Score": emb_score,
            "Matched_Skills": matched,
            "Missing_Skills": missing,
            "Final_Score": final_score
        }






