const AuthorizeRoles = (...authorizedRoles) => {
  return (request, response, next) => {
    const roleIntersection = authorizedRoles.filter((x) =>
      request.roles.includes(x)
    );

    if (!roleIntersection.length) {
      return response
        .status(403)
        .json({ Status: false, Error: "Access denied." });
    }

    next();
  };
};

export default AuthorizeRoles;
