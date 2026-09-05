const FooterBar = () => {
  var currentYear = new Date().getFullYear();
  return (
    <footer className="navbar navbar-expand-lg py-3 fixed-bottom bg-dark">
      <span className="position-absolute py-1 bottom-0 end-0 text-orangered">
        © Uttoron {currentYear}. All rights reserved.
      </span>
    </footer>
  );
};

export default FooterBar;
