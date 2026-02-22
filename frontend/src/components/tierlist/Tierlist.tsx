import { useEffect, useState } from "react";
import { computeOverallAvg, type Course } from "../../types";
import { TierCategory } from "./TierCategory";
import { hashString } from "../../shared";


interface TierlistProps {
  courses: Course[];
}

// Gives a classic ranking terlist (S, A, B, C, D, E, F) of courses
// For each course the user will add them to a tier
export const Tierlist = ({ courses }: TierlistProps) => {

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

        // Only do for first 30 courses to avoid overcrowding
        const limitedCourses = courses.slice(0, 30);
        limitedCourses.forEach(course => {

            // // This gives persistent tiers
            // const tierIndex = hashString(course.code + course.name) % 7;
            // const randomTier = ['S', 'A', 'B', 'C', 'D', 'E', 'F'][tierIndex];

            // // Only add if less than 10 elements
            // if (newTiers[randomTier].length < 7) {
            //     newTiers[randomTier].push(course);
            // }

            // New version we use the actual avg instead of faking in frontnd
            const value = computeOverallAvg(course); // value is between 1 and 5
            let tier: string;
            if (value === null) { // In case value is not set we use E as default
                tier = 'E'; 
            } else if (value >= 4) {
                tier = 'S';
            } else if (value >= 3.8) {
                tier = 'A';
            } else if (value >= 3.4) {
                tier = 'B';
            } else if (value >= 3.1) {
                tier = 'C';
            } else if (value >= 2.9) {
                tier = 'D';
            } else if (value >= 2.7) {
                tier = 'E';
            } else {
                tier = 'F';
            }

            newTiers[tier].push(course);
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