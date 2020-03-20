import React, {Component} from "react";
import PropTypes from "prop-types";
import {Tooltip2} from "@blueprintjs/labs";
import "./SourceGroup.css";

class SourceGroup extends Component {

  render() {
    const {sources} = this.props;
    const {pathname} = this.context.router.location;
    const embed = pathname.includes("profile") && pathname.split("/").filter(Boolean).length === 5;
    if (!embed && (!sources || !sources.length)) return null;

    return <div className="SourceGroup">
      Data from
      { sources.map((source, i) => {

        const {
          dataset_description: datasetDesc,
          dataset_link: datasetLink,
          dataset_name: dataset,
          source_description: orgDesc,
          source_link: orgLink,
          source_name: org
        } = source;

        const orgName = org && `the ${org.replace(/^(T|t)he\s/g, "")}`;
        const datasetName = dataset && `${dataset}`;

        return <span key={i} className="source">
          { i && i === sources.length - 1 ? <span> and</span> : null }
          { org && <span>&nbsp;</span> }
          { org && <Tooltip2 content={orgDesc} className={orgDesc ? "active" : ""} disabled={!orgDesc}>
            { orgLink ? <a href={orgLink} target="_blank" rel="noopener noreferrer" dangerouslySetInnerHTML={{__html: orgName}} /> : <span dangerouslySetInnerHTML={{__html: orgName}} /> }
          </Tooltip2> }
          { dataset && <span>&nbsp;</span> }
          { dataset && <Tooltip2 content={datasetDesc} className={datasetDesc ? "active" : ""} disabled={!datasetDesc}>
            { datasetLink ? <a href={datasetLink} target="_blank" rel="noopener noreferrer" dangerouslySetInnerHTML={{__html: datasetName}} /> : <span dangerouslySetInnerHTML={{__html: datasetName}} /> }
          </Tooltip2> }
          { i < sources.length - 1 && <span>,</span> }
        </span>;
      })}
      <span>.</span>
    </div>;
  }

}

SourceGroup.contextTypes = {
  router: PropTypes.object
};

export default SourceGroup;
