import { use, useEffect, useState } from "react";
import type { Course } from "../../types";
import { TierCategory } from "./TierCategory";


interface TierlistProps {
  courses: Course[];
}

// Gives a classic ranking terlist (S, A, B, C, D, E, F) of courses
// For each course the user will add them to a tier
export const Tierlist = ({ courses }: TierlistProps) => {

    const [coursesToGrade, setCoursesToGrade] = useState<Course[]>(courses);
    const [tiers, setTiers] = useState<{ [key: string]: Course[] }>({
        S: [],
        A: [],
        B: [],
        C: [],
        D: [],
        E: [],
        F: []
    });


    // Assign all courses to random tiers for demo purposes. In a real app, the user would drag and drop courses into tiers or use some other UI to assign them.
    useEffect(() => {
        const newTiers: { [key: string]: Course[] } = {
            S: [],
            A: [],
            B: [],
            C: [],
            D: [],
            E: [],
            F: []
        };

        courses.forEach(course => {
            const randomTier = ['S', 'A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 7)];
            newTiers[randomTier].push(course);
        });

        setTiers(newTiers);
    }, [courses]);



    return (
        <div style={{ maxWidth: '800px', minWidth: '300px', margin: '0 auto' }}>
        
        {Object.keys(tiers).map(tier => (
            <TierCategory key={tier} tier={tier} courses={tiers[tier]} />
        ))}

        </div>
    )

}