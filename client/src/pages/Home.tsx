import Navbar from "../components/layout/Navbar";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import PopularSkills from "../components/landing/PopularSkills";
import Community from "../components/landing/Community";
import CTA from "../components/landing/CTA";
import Footer from "../components/layout/Footer";

const Home = () => {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <HowItWorks />
        <PopularSkills />
        <Community />
        <CTA />
      </main>

      <Footer />
    </>
  );
};

export default Home;