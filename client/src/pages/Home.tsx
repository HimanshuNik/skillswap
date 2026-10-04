import Navbar from "../components/layout/Navbar";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import PopularSkills from "../components/landing/PopularSkills";

const Home = () => {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <HowItWorks />
        <PopularSkills />
      </main>
    </>
  );
};

export default Home;