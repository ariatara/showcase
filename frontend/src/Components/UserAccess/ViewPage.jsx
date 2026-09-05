import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Axios from 'axios';
import { ServerLocation } from '../../Utilities/Locations';

const ViewPage = () => {
    const { page_url } = useParams();
    const [pageDetails, setPageDetails] = useState({
        pageTitle: "",
        pageContent: "",
        pageURL: "",
        isPublished: false,
        createdBy: "",
        createdDateTime: "",
        modifiedBy: "",
        modifiedDateTime: "",
    });
    useEffect(() => {
        Axios.get(ServerLocation("/user/pages/" + page_url))
            .then((response) => {
                if (response.data.Status) {
                    setPageDetails({
                        pageTitle: response.data.Result[0].page_title,
                        pageContent: response.data.Result[0].page_content,
                        pageURL: response.data.Result[0].url,
                        isPublished: response.data.Result[0].published,
                        createdBy: response.data.Result[0].created_by,
                        createdDateTime: response.data.Result[0].created_date,
                        modifiedBy: response.data.Result[0].modified_by,
                        modifiedDateTime: response.data.Result[0].modified_date,
                    });
                } else {
                    console.error("Failed to fetch page details.");
                }
            })
            .catch((error) => {
                console.error("Error fetching page details:", error);
            });
    }, [page_url]);
    return (
        <div className="container mt-5">
            <h2>{pageDetails.pageTitle}</h2>
            <p>Created by: {pageDetails.createdBy}</p>
            <p>Created on: {pageDetails.createdDateTime}</p>
            <p>Modified by: {pageDetails.modifiedBy}</p>
            <p>Modified on: {pageDetails.modifiedDateTime}</p>
            <div className="mt-3">
                <div dangerouslySetInnerHTML={{ __html: pageDetails.pageContent }} />
            </div>
            <div className="mt-3">
                <p><strong>Page URL:</strong> {pageDetails.pageURL}</p>
                <p><strong>Published:</strong> {pageDetails.isPublished ? "Yes" : "No"}</p>
            </div>
        </div>
    );
}

export default ViewPage;