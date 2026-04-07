import React from 'react';
import { QuestionPaper } from '@/stores/questionPaperStore';

interface PrintablePaperProps {
  paper: QuestionPaper;
}

// This component is specifically for print/PDF with proper color rendering
const PrintablePaper: React.FC<PrintablePaperProps> = ({ paper }) => {
  return (
    <div 
      id="printable-paper"
      className="print-paper"
      style={{ 
        backgroundColor: paper.paperColor, 
        color: paper.textColor,
        fontFamily: 'Times New Roman, serif',
        padding: '40px',
        minHeight: '100%',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '18px', 
          fontWeight: 'bold', 
          textTransform: 'uppercase',
          margin: '0 0 4px 0',
          color: paper.textColor,
        }}>
          {paper.collegeName}
        </h1>
        <h2 style={{ 
          fontSize: '14px', 
          fontWeight: '600',
          margin: '0 0 4px 0',
          color: paper.textColor,
        }}>
          {paper.departmentName}
        </h2>
        <p style={{ 
          fontSize: '12px',
          margin: '0 0 8px 0',
          color: paper.textColor,
        }}>
          Master of Computer Applications Semester: {paper.semester}
        </p>
        <p style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          textTransform: 'uppercase',
          margin: '0',
          color: paper.textColor,
        }}>
          CONTINUOUS ASSESSMENT TEST – {paper.examType}
        </p>
      </div>
      
      {/* Course Info */}
      <div style={{ 
        borderTop: `2px solid ${paper.textColor}`,
        borderBottom: `2px solid ${paper.textColor}`,
        padding: '8px 0',
        margin: '16px 0',
        textAlign: 'center',
      }}>
        <div style={{ fontWeight: '600', color: paper.textColor }}>
          {paper.courseCode} – {paper.courseName}
        </div>
      </div>
      
      {/* Time and Marks */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '16px',
        fontSize: '12px',
        color: paper.textColor,
      }}>
        <span><strong>Time:</strong> {paper.duration}</span>
        <span><strong>Maximum Marks:</strong> {paper.maxMarks}</span>
      </div>
      
      {/* Instructions */}
      {paper.instructions.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontWeight: 'bold', 
            fontSize: '12px', 
            marginBottom: '8px',
            textDecoration: 'underline',
            color: paper.textColor,
          }}>
            INSTRUCTIONS:
          </h3>
          <ol style={{ 
            margin: '0',
            paddingLeft: '20px',
            fontSize: '12px',
            color: paper.textColor,
          }}>
            {paper.instructions.map((inst, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>{inst}</li>
            ))}
          </ol>
        </div>
      )}
      
      {/* Course Outcomes */}
      {paper.courseOutcomes.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            fontWeight: 'bold', 
            fontSize: '12px', 
            marginBottom: '8px',
            color: paper.textColor,
          }}>
            Course Outcome Table:
          </h3>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '12px',
          }}>
            <thead>
              <tr>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'left',
                  color: paper.textColor,
                }}>COs</th>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'left',
                  color: paper.textColor,
                }}>At the end of learning this course, students will be able to</th>
              </tr>
            </thead>
            <tbody>
              {paper.courseOutcomes.map((co, idx) => (
                <tr key={idx}>
                  <td style={{ 
                    border: `1px solid ${paper.textColor}`, 
                    padding: '4px 8px', 
                    fontWeight: '600',
                    color: paper.textColor,
                  }}>{co.code}</td>
                  <td style={{ 
                    border: `1px solid ${paper.textColor}`, 
                    padding: '4px 8px',
                    color: paper.textColor,
                  }}>{co.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Questions Table */}
      {paper.sections.map((section) => (
        <div key={section.id} style={{ marginBottom: '24px' }}>
          {section.name && (
            <h3 style={{ 
              fontWeight: 'bold', 
              fontSize: '12px', 
              marginBottom: '8px',
              color: paper.textColor,
            }}>
              {section.name}
            </h3>
          )}
          {section.instructions && (
            <p style={{ 
              fontSize: '12px', 
              fontStyle: 'italic', 
              marginBottom: '8px',
              color: paper.textColor,
            }}>
              {section.instructions}
            </p>
          )}
          
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            fontSize: '12px',
          }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'center',
                  width: '50px',
                  color: paper.textColor,
                }}>Q. No.</th>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'center',
                  width: '60px',
                  color: paper.textColor,
                }}>Sub Division</th>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'left',
                  color: paper.textColor,
                }}>Question</th>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'center',
                  width: '50px',
                  color: paper.textColor,
                }}>Marks</th>
                <th style={{ 
                  border: `1px solid ${paper.textColor}`, 
                  padding: '4px 8px', 
                  textAlign: 'center',
                  width: '40px',
                  color: paper.textColor,
                }}>BTL</th>
              </tr>
            </thead>
            <tbody>
              {section.questions.map((question) => (
                <React.Fragment key={question.id}>
                  {question.isAlternative && (
                    <tr>
                      <td 
                        colSpan={5} 
                        style={{ 
                          border: `1px solid ${paper.textColor}`, 
                          padding: '4px 8px', 
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: paper.textColor,
                        }}
                      >
                        (OR)
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ 
                      border: `1px solid ${paper.textColor}`, 
                      padding: '4px 8px', 
                      textAlign: 'center',
                      verticalAlign: 'top',
                      color: paper.textColor,
                    }}>
                      {!question.isAlternative && question.questionNo}
                    </td>
                    <td style={{ 
                      border: `1px solid ${paper.textColor}`, 
                      padding: '4px 8px', 
                      textAlign: 'center',
                      verticalAlign: 'top',
                      color: paper.textColor,
                    }}>
                      {question.subDivision}
                    </td>
                    <td style={{ 
                      border: `1px solid ${paper.textColor}`, 
                      padding: '4px 8px',
                      verticalAlign: 'top',
                      color: paper.textColor,
                    }}>
                      {question.content}
                    </td>
                    <td style={{ 
                      border: `1px solid ${paper.textColor}`, 
                      padding: '4px 8px', 
                      textAlign: 'center',
                      verticalAlign: 'top',
                      color: paper.textColor,
                    }}>
                      {question.marks}
                    </td>
                    <td style={{ 
                      border: `1px solid ${paper.textColor}`, 
                      padding: '4px 8px', 
                      textAlign: 'center',
                      verticalAlign: 'top',
                      color: paper.textColor,
                    }}>
                      {question.btl}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      
      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '32px',
        fontSize: '12px',
        color: paper.textColor,
      }}>
        **********
      </div>
    </div>
  );
};

export default PrintablePaper;
