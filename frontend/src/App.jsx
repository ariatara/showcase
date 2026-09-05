import "bootstrap/dist/css/bootstrap.min.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminDashboard from "./Components/AdminAccess/AdminDashboard";
import AdminHome from "./Components/AdminAccess/AdminHome";
import RoleTypes from "./Components/AdminAccess/RoleTypes";
import AddRoleType from "./Components/AdminAccess/AddRoleType";
import MembershipCategories from "./Components/AdminAccess/MembershipCategories";
import AddMembershipCategory from "./Components/AdminAccess/AddMembershipCategory";
import MembershipPrices from "./Components/AdminAccess/MembershipPrices";
import AddMembershipPrice from "./Components/AdminAccess/AddMembershipPrice";
import AgeGroups from "./Components/AdminAccess/AgeGroups";
import AddAgeGroup from "./Components/AdminAccess/AddAgeGroup";
import Accounts from "./Components/AdminAccess/Accounts";
import Members from "./Components/AdminAccess/Members";
import EditAccount from "./Components/AdminAccess/EditAccount";
import AccountRoles from "./Components/AdminAccess/AccountRoles";
import AddAccountRole from "./Components/AdminAccess/AddAccountRole";

import AccountDashboard from "./Components/AccountAccess/AccountDashboard";
import AccountHome from "./Components/AccountAccess/AccountHome";
import RegisterMember from "./Components/AccountAccess/RegisterMember";

import AccountRoutes from "./Components/RouteManagement/AccountRoutes";
import AdminRoutes from "./Components/RouteManagement/AdminRoutes";

import CreateAccount from "./Components/UserAccess/CreateAccount";
import AccountLogin from "./Components/UserAccess/AccountLogin";
import ShoppingArea from "./Components/UserAccess/ShoppingArea";
import ShoppingCheckout from "./Components/UserAccess/ShoppingCheckout";
import NavigationBar from "./Components/UserAccess/NavigationBar";
import FooterBar from "./Components/UserAccess/FooterBar";
import Events from "./Components/AdminAccess/Events";
import { CreateEvent } from "./Components/AdminAccess/CreateEvent";

import "../css/style.css";
import ViewEvent from "./Components/UserAccess/ViewEvent";
import ViewPage from "./Components/UserAccess/ViewPage";
import Pages from "./Components/AdminAccess/Pages";
import { CreatePage } from "./Components/AdminAccess/CreatePage";
import { EditEvent } from "./Components/AdminAccess/EditEvent";
import ProductTypes from "./Components/AdminAccess/ProductTypes";
import AddProductType from "./Components/AdminAccess/AddProductType";

function App() {
  return (
    <BrowserRouter>
      <NavigationBar />
      <Routes>
        <Route path="/" element={<AccountLogin />}></Route>
        <Route path="/login" element={<AccountLogin />}></Route>
        <Route path="/createAccount" element={<CreateAccount />}></Route>
        <Route path="events/:event_url" element={<ViewEvent />}></Route>
        <Route path="pages/:page_url" element={<ViewPage />}></Route>
        <Route path="shoppingArea" element={<ShoppingArea />}></Route>
        <Route path="shoppingCheckout" element={<ShoppingCheckout />}></Route>

        <Route
          path="/adminDashboard"
          element={
            <AdminRoutes>
              <AdminDashboard />
            </AdminRoutes>
          }
        >
          <Route path="" element={<AdminHome />}></Route>
          <Route path="roleTypes" element={<RoleTypes />}></Route>
          <Route path="addRoleType" element={<AddRoleType />}></Route>
          <Route path="ageGroups" element={<AgeGroups />}></Route>
          <Route path="addAgeGroup" element={<AddAgeGroup />}></Route>
          <Route
            path="membershipCategories"
            element={<MembershipCategories />}
          ></Route>
          <Route
            path="addMembershipCategory"
            element={<AddMembershipCategory />}
          ></Route>
          <Route path="membershipPrices" element={<MembershipPrices />}></Route>
          <Route
            path="addMembershipPrice"
            element={<AddMembershipPrice />}
          ></Route>
          <Route path="productTypes" element={<ProductTypes />}></Route>
          <Route path="addProductType" element={<AddProductType />}></Route>
          <Route path="editAccount/:id" element={<EditAccount />}></Route>
          <Route path="accounts" element={<Accounts />}></Route>
          <Route
            path="accountRoles/:account_email"
            element={<AccountRoles />}
          ></Route>
          <Route
            path="addAccountRole/:account_email"
            element={<AddAccountRole />}
          ></Route>
          <Route path="members" element={<Members />}></Route>
          <Route path="events" element={<Events />}></Route>
          <Route path="addEvent" element={<CreateEvent />}></Route>
          <Route path="editEvent/:event_url" element={<EditEvent />}></Route>
          <Route path="pages" element={<Pages />}></Route>
          <Route path="createPage" element={<CreatePage />}></Route>
        </Route>

        <Route
          path="/accountDashboard/:account_email"
          element={
            <AccountRoutes>
              <AccountDashboard />
            </AccountRoutes>
          }
        >
          <Route path="" element={<AccountHome />}></Route>
          <Route path="registerMember" element={<RegisterMember />}></Route>
        </Route>
      </Routes>
      <FooterBar />
    </BrowserRouter>
  );
}

export default App;
