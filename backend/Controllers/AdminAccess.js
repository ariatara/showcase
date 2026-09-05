import DatastoreConnection from "../Utilities/Datastore.js";
import FileUpload from "../Utilities/FileUpload.js";

export const addRoleTypeAdminAccess = (request, response) => {
  const SQLQuery = "INSERT INTO role_types (`role`) VALUES (?)";
  DatastoreConnection.query(
    SQLQuery,
    [request.body.roleType],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Add role type failed.",
        });
      return response.json({ Status: true });
    }
  );
};

export const roleTypesAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM role_types";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get role types failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const addAgeGroupAdminAccess = (request, response) => {
  const SQLQuery = "INSERT INTO age_groups (`group`) VALUES (?)";
  DatastoreConnection.query(
    SQLQuery,
    [request.body.ageGroup],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Add age group failed.",
        });
      return response.json({ Status: true });
    }
  );
};

export const ageGroupsAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM age_groups";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get age groups failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const addMembershipCategoryAdminAccess = (request, response) => {
  const SQLQuery = "INSERT INTO membership_categories (`category`) VALUES (?)";
  DatastoreConnection.query(
    SQLQuery,
    [request.body.membershipCategory],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Add membership category failed.",
        });
      return response.json({ Status: true });
    }
  );
};

export const membershipCategoriesAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM membership_categories";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get membership categories failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const addMembershipPriceAdminAccess = (request, response) => {
  const SQLQuery = "INSERT INTO membership_prices (category, price) VALUES (?)";

  const priceDetails = [request.body.category, request.body.price];

  DatastoreConnection.query(SQLQuery, [priceDetails], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Add membership price failed.",
      });
    return response.json({ Status: true });
  });
};

export const membershipPricesAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM membership_prices";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get membership prices failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const addProductTypeAdminAccess = (request, response) => {
  const SQLQuery = "INSERT INTO product_types (`type`) VALUES (?)";
  DatastoreConnection.query(
    SQLQuery,
    [request.body.productType],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Add product type failed.",
        });
      return response.json({ Status: true });
    }
  );
};

export const productTypesAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM product_types";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get product types failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const allAccountsAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM accounts";
  DatastoreConnection.query(
    SQLQuery,
    [request.body.category],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Get accounts failed.",
        });
      return response.json({ Status: true, Result: result });
    }
  );
};

export const accountAdminAccess = (request, response) => {
  const id = request.params.id;
  const SQLQuery = "SELECT * FROM accounts WHERE id = ?";
  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get account failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const editAccountAdminAccess = (request, response) => {
  const id = request.params.id;
  const SQLQuery =
    "UPDATE accounts set first_name = ?, last_name= ?, account_email = ? WHERE id = ?";

  const accountDetails = [
    request.body.first_name,
    request.body.last_name,
    request.body.account_email,
  ];

  DatastoreConnection.query(
    SQLQuery,
    [...accountDetails, id],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Edit account failed: " + error,
        });
      return response.json({ Status: true, Result: result });
    }
  );
};

export const accountRolesAdminAccess = (request, response) => {
  const account_email = request.params.account_email;

  const SQLQuery = "SELECT * FROM account_roles WHERE account_email = ?";

  DatastoreConnection.query(SQLQuery, [account_email], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get account roles failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const addAccountRoleAdminAccess = (request, response) => {
  const SQLQuery =
    "INSERT INTO account_roles (account_email, account_role) VALUES (?)";

  const accountRoleDetails = [
    request.body.account_email,
    request.body.account_role,
  ];

  DatastoreConnection.query(SQLQuery, [accountRoleDetails], (error, result) => {
    if (error) {
      console.log("Add account role failed: " + error);
      return response.json({
        Status: false,
        Error: "Add account role failed.",
      });
    }
    return response.json({ Status: true });
  });
};

export const deleteAccountRoleAdminAccess = (request, response) => {
  const id = request.params.id;

  const SQLQuery = "DELETE FROM account_roles WHERE id = ?";

  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Delete account role failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const allMembersAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM members";
  DatastoreConnection.query(
    SQLQuery,
    [request.body.category],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Get members failed.",
        });
      return response.json({ Status: true, Result: result });
    }
  );
};

export const memberAdminAccess = (request, response) => {
  const id = request.params.id;
  const SQLQuery = "SELECT * FROM members WHERE id = ?";
  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get member failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const editMemberAdminAccess = (request, response) => {
  const id = request.params.id;
  const SQLQuery =
    "UPDATE members set account_email = ?, first_name = ?, last_name = ?, age_group = ?, member_email = ?, member_category = ? WHERE id = ?";

  const memberDetails = [
    request.body.account_email,
    request.body.first_name,
    request.body.last_name,
    request.body.age_group,
    request.body.member_email,
    request.body.member_category,
  ];

  DatastoreConnection.query(
    SQLQuery,
    [...memberDetails, id],
    (error, result) => {
      if (error)
        return response.json({
          Status: false,
          Error: "Edit member failed: " + error,
        });
      return response.json({ Status: true, Result: result });
    }
  );
};

//Admin Metrics

export const adminCountAdminAccess = (request, response) => {
  const SQLQuery =
    "SELECT COUNT(id) AS count FROM account_roles WHERE account_role='Administrator'";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error) {
      console.log("Administrator count failed:" + error);

      return response.json({
        Status: false,
        Error: "Administrator count failed.",
      });
    }

    return response.json({ Status: true, Result: result });
  });
};

export const accountCountAdminAccess = (request, response) => {
  const SQLQuery = "SELECT COUNT(id) AS count FROM accounts";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error) {
      console.log("Account count failed:" + error);

      return response.json({
        Status: false,
        Error: "Account count failed.",
      });
    }

    return response.json({ Status: true, Result: result });
  });
};

export const memberCountAdminAccess = (request, response) => {
  const SQLQuery = "SELECT COUNT(id) as count FROM members";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error) {
      console.log("Member count failed: " + error);

      return response.json({
        Status: false,
        Error: "Member count failed.",
      });
    }

    return response.json({ Status: true, Result: result });
  });
};

export const adminRecordsAdminAccess = (request, response) => {
  const SQLQuery =
    "SELECT * FROM account_roles WHERE account_role='Administrator'";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error) {
      console.log("Admin record fetch failed: " + error);

      return response.json({
        Status: false,
        Error: "Admin records fetch failed.",
      });
    }
    return response.json({ Status: true, Result: result });
  });
};

//Event Pages

export const getEventsAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM events";

  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Get events failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const createEventAdminAccess = (request, response) => {
  const SQLQuery =
    "INSERT INTO events (url, page_title, event_title, start_date, start_time, end_date, end_time, venue_address, map_link, banner_background_image_name, \
	  upper_hub_content, upper_hub_background_image_name, upper_hub_event_image_names, lower_hub_content, lower_hub_background_image_name, \
	  lower_hub_event_image_names, published, created_by, created_date, modified_by, modified_date) VALUES (?)";

  console.log(request.body);

  const eventDetails = [
    request.body.eventURL,
    request.body.pageTitle,
    request.body.eventTitle,
    request.body.startDate,
    request.body.startTime,
    request.body.endDate,
    request.body.endTime,
    request.body.venueAddress,
    request.body.mapLink,
    request.body.bannerBackground,
    request.body.upperHubContent,
    request.body.upperHubBackground,
    request.body.upperHubEventImages,
    request.body.lowerHubContent,
    request.body.lowerHubBackground,
    request.body.lowerHubEventImages,
    request.body.isPublished,
    request.body.createdBy,
    request.body.createdDateTime,
    request.body.modifiedBy,
    request.body.modifiedDateTime,
  ];

  console.log(eventDetails);

  DatastoreConnection.query(SQLQuery, [eventDetails], (error, result) => {
    if (error) {
      console.log("Create event error: " + error + "; result: " + result);
      return response.json({
        Status: false,
        Error: "Create event failed.",
      });
    }
    return response.json({ Status: true });
  });
};

export const updateEventAdminAccess = (request, response) => {
  const id = request.params.id;

  const eventDetails = [
    request.body.eventURL,
    request.body.pageTitle,
    request.body.eventTitle,
    request.body.startDate,
    request.body.startTime,
    request.body.endDate,
    request.body.endTime,
    request.body.venueAddress,
    request.body.mapLink,
    request.body.bannerBackground,
    request.body.upperHubContent,
    request.body.upperHubBackground,
    request.body.upperHubEventImages,
    request.body.lowerHubContent,
    request.body.lowerHubBackground,
    request.body.lowerHubEventImages,
    request.body.isPublished,
    request.body.modifiedBy,
    request.body.modifiedDateTime,
    id,
  ];

  const SQLQuery =
    "UPDATE events \
      SET url = COALESCE(?, url), \
        page_title = COALESCE(?, page_title), \
        event_title = COALESCE(?, event_title), \
        start_date = COALESCE(?, start_date), \
        start_time = COALESCE(? , start_time), \
        end_date = COALESCE(?, end_date), \
        end_time = COALESCE(?, end_time), \
        venue_address = COALESCE(?, venue_address), \
        map_link = COALESCE(?, map_link), \
        banner_background_image_name = COALESCE(?, banner_background_image_name), \
        upper_hub_content = COALESCE(?, upper_hub_content), \
        upper_hub_background_image_name = COALESCE(?, upper_hub_background_image_name), \
        upper_hub_event_image_names = COALESCE(?,upper_hub_event_image_names), \
        lower_hub_content = COALESCE(?, lower_hub_content), \
        lower_hub_background_image_name = COALESCE(?, lower_hub_background_image_name), \
        lower_hub_event_image_names = COALESCE(?, lower_hub_event_image_names), \
        published = COALESCE(?, published), \
        modified_by = COALESCE(?, modified_by), \
        modified_date = COALESCE(?, modified_date) \
      WHERE id = ?";

  DatastoreConnection.query(SQLQuery, eventDetails, (error, result) => {
    if (error) {
      console.log("Update event error: " + error + "; result: " + result);
      return response.json({
        Status: false,
        Error: "Update event failed.",
      });
    }
    return response.json({ Status: true });
  });
};

export const deleteEventAdminAccess = (request, response) => {
  const id = request.params.id;

  const SQLQuery = "DELETE FROM events WHERE id = ?";

  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Delete account failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

export const getPagesAdminAccess = (request, response) => {
  const SQLQuery = "SELECT * FROM pages";
  DatastoreConnection.query(SQLQuery, (error, result) => {
    if (error) {
      console.log("Get pages error: " + error + "; result: " + result);
      return response.json({
        Status: false,
        Error: "Get pages failed.",
      });
    }
    return response.json({ Status: true, Result: result });
  });
};

export const createPageAdminAccess = (request, response) => {
  const SQLQuery =
    "INSERT INTO pages (url, page_title, page_background_image_name, page_content, published, created_by, created_date, modified_by, modified_date) VALUES (?)";

    const pageDetails = [
    request.body.pageURL,
    request.body.pageTitle,
    request.body.pageBackground,
    request.body.pageContent.value,
    request.body.isPublished,
    request.body.createdBy,
    request.body.createdDateTime,
    request.body.modifiedBy,
    request.body.modifiedDateTime,
  ];
  DatastoreConnection.query(SQLQuery, [pageDetails], (error, result) => {
    if (error) {
      console.log("Create page error: " + error + "; result: " + result);
      return response.json({
        Status: false,
        Error: "Create page failed.",
      });
    }
    return response.json({ Status: true });
  });
};
export const updatePageAdminAccess = (request, response) => {
  const id = request.params.id;
  const pageDetails = [
    request.body.pageURL,
    request.body.pageTitle,
    request.body.pageBackground,
    request.body.pageContent.value,
    request.body.modifiedBy,
    request.body.modifiedDateTime,
    id,
  ];  
  const SQLQuery =
    "UPDATE pages \
      SET url = COALESCE(?, url), \
        page_title = COALESCE(?, page_title), \
        page_background_image_name = COALESCE(?, page_background_image_name), \
        page_content = COALESCE(?, page_content), \
        modified_by = COALESCE(?, modified_by), \
        modified_date = COALESCE(?, modified_date) \
      WHERE id = ?";
  DatastoreConnection.query(SQLQuery, pageDetails, (error, result) => {
    if (error) {
      console.log("Update page error: " + error + "; result: " + result);
      return response.json({
        Status: false,
        Error: "Update page failed.",
      });
    }
    return response.json({ Status: true });
  });
};

export const deletePageAdminAccess = (request, response) => {
  const id = request.params.id;
  const SQLQuery = "DELETE FROM pages WHERE id = ?";
  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Delete page failed.",
      });
    return response.json({ Status: true, Result: result });
  }
  );
};

export const uploadFileAdminAccess = (request, response, next) => {
  const fieldName = request.params.fieldName;

  FileUpload.single(fieldName)(request, response, () => {
    if (request.file == null) {
      return response.status(400).json({ Error: "File name not found." });
    }

    return response.status(200).json(request.file.filename);
  });
};

//Member Products

export const getMemberProductsAdminAccess = (request, response) => {
  const eventURL = request.params.event_url;

  if (eventURL) {
    const SQLQuery = "SELECT * FROM member_products WHERE event_url = ?";

    DatastoreConnection.query(SQLQuery, [eventURL], (error, result) => {
      if (error) {
        console.log(
          "Get member products error: " + error + "; result: " + result
        );
        return response.json({
          Status: false,
          Error: "Get member products failed.",
        });
      }

      return response.json({ Status: true, Result: result });
    });
  }
};

export const createMemberProductsAdminAccess = (
  request,
  response,
  callback = null
) => {
  const SQLQuery =
    "INSERT INTO member_products (name, type, image_name, target, price, inventory, event_url, event_date) VALUES ?";

  console.log(request.body);

  const products = Array.isArray(request.body) ? request.body : [request.body];

  const memberProductsDetails = products.map((product) => [
    product.productName,
    product.productType,
    product.productImage,
    product.productTarget,
    product.productPrice,
    product.productInventory,
    product.eventURL,
    product.eventDate,
  ]);

  console.log("Bulk inserting products:", memberProductsDetails.length);

  DatastoreConnection.query(
    SQLQuery,
    [memberProductsDetails],
    (error, result) => {
      if (error) {
        console.log(
          "Create member product error: " + error + "; result: " + result
        );
        const errorResponse = {
          Status: false,
          Error: "Create member products failed.",
        };

        if (callback) {
          return callback(error, null);
        }
        return response.json(errorResponse);
      }

      const successResponse = {
        Status: true,
        ProductsCreated: memberProductsDetails.length,
      };

      if (callback) {
        return callback(null, successResponse);
      }
      return response.json(successResponse);
    }
  );
};

export const updateMemberProductsByEventAdminAccess = (request, response) => {
  // Call delete with callback to ensure it completes before create
  deleteMemberProductsByEventAdminAccess(
    request,
    response,
    (deleteError, deleteResult) => {
      if (deleteError) {
        return response.json({
          Status: false,
          Error: "Delete member products failed.",
        });
      }

      // Only call create after successful deletion
      createMemberProductsAdminAccess(
        request,
        response,
        (createError, createResult) => {
          if (createError) {
            return response.json({
              Status: false,
              Error: "Create member products failed.",
            });
          }

          // Send final response only
          return response.json({
            Status: true,
            Message: "Member products updated successfully",
            ProductsUpdated: createResult.ProductsCreated,
          });
        }
      );
    }
  );
};

export const deleteMemberProductsByEventAdminAccess = (
  request,
  response,
  callback = null
) => {
  const eventURL = request.params.event_url;

  const SQLQuery = "DELETE FROM member_products WHERE event_url = ?";

  DatastoreConnection.query(SQLQuery, [eventURL], (error, result) => {
    if (error) {
      const errorResponse = {
        Status: false,
        Error: "Delete member products failed.",
      };

      if (callback) {
        return callback(error, null);
      }
      return response.json(errorResponse);
    }

    const successResponse = { Status: true, Result: result };

    if (callback) {
      return callback(null, successResponse);
    }
    return response.json(successResponse);
  });
};

export const deleteMemberProductByIdAdminAccess = (request, response) => {
  const id = request.params.id;

  const SQLQuery = "DELETE FROM member_products WHERE id = ?";

  DatastoreConnection.query(SQLQuery, [id], (error, result) => {
    if (error)
      return response.json({
        Status: false,
        Error: "Delete member product failed.",
      });
    return response.json({ Status: true, Result: result });
  });
};

//Admin Logout

export const logoutAdminAccess = (request, response) => {
  response.clearCookie("loginToken");
  return response.json({ Status: true });
};
