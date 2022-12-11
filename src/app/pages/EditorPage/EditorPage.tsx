import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";

export default function EditorPage() {
  return (
    <EditorContainer>
      <CodePanel>Code</CodePanel>
      <ProjectPanel>Project</ProjectPanel>
      <InspectorPanel>Inspector</InspectorPanel>
    </EditorContainer>
  );
}

const EditorContainer = styled("div")`
  display: grid;
  flex: 1;
  grid-gap: 16px;
  margin: 16px;
  grid-template-areas:
    "code code code project"
    "code code code inspector"; ;
`;
const CodePanel = styled(Paper)`
  grid-area: code;
`;
const ProjectPanel = styled(Paper)`
  grid-area: project;
`;
const InspectorPanel = styled(Paper)`
  grid-area: inspector;
`;
